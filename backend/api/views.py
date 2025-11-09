from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Q
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import User, Note, JournalEntry, PartnerRequest, UserProfile, NoteLike, PushSubscription
from .serializers import (
    UserSerializer, RegisterSerializer, NoteSerializer,
    JournalEntrySerializer, PartnerRequestSerializer,
    UserProfileSerializer, PartnerProfileSerializer, PushSubscriptionSerializer
)
from .notification_utils import send_notification_to_partner
import json


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if username and password:
        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
    
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def connect_partner(request):
    partner_code = request.data.get('partner_code')
    if not partner_code:
        return Response({'error': 'Partner code is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        partner = User.objects.get(partner_code=partner_code)
        if partner == request.user:
            return Response({'error': 'Cannot connect to yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user.partner:
            return Response({'error': 'You already have a partner'}, status=status.HTTP_400_BAD_REQUEST)
        
        if partner.partner:
            return Response({'error': 'This user already has a partner'}, status=status.HTTP_400_BAD_REQUEST)
        
        request.user.partner = partner
        partner.partner = request.user
        request.user.save()
        partner.save()
        
        return Response({
            'message': 'Partner connected successfully',
            'partner': UserSerializer(partner).data
        })
    except User.DoesNotExist:
        return Response({'error': 'Invalid partner code'}, status=status.HTTP_404_NOT_FOUND)


class NoteListCreateView(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Get own notes and partner's shared notes
        if user.partner:
            return Note.objects.filter(
                Q(author=user) | (Q(author=user.partner) & Q(is_shared=True))
            )
        return Note.objects.filter(author=user)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        search_type = self.request.query_params.get('search_type', 'both')
        search_query = self.request.query_params.get('search', '')
        context['search_type'] = search_type
        context['search_query'] = search_query
        return context
    
    def filter_queryset(self, queryset):
        search_query = self.request.query_params.get('search', '')
        search_type = self.request.query_params.get('search_type', 'both')
        
        if search_query:
            if search_type == 'title':
                return queryset.filter(title__icontains=search_query)
            elif search_type == 'content':
                return queryset.filter(content__icontains=search_query)
            else:  # both
                return queryset.filter(
                    Q(title__icontains=search_query) | Q(content__icontains=search_query)
                )
        return queryset

    def perform_create(self, serializer):
        note = serializer.save(author=self.request.user)
        # Send notification to partner
        if note.is_shared and self.request.user.partner:
            send_notification_to_partner(
                self.request.user,
                'note_created',
                f'💕 New Note from {self.request.user.username}',
                f'"{note.title}"',
                note_id=note.id
            )


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.partner:
            return Note.objects.filter(
                Q(author=user) | (Q(author=user.partner) & Q(is_shared=True))
            )
        return Note.objects.filter(author=user)
    
    def update(self, request, *args, **kwargs):
        note = self.get_object()
        user = request.user
        
        # Check if user is author or partner
        if note.author != user and (not user.partner or note.author != user.partner):
            return Response({'error': 'You do not have permission to edit this note'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # If user is the author, allow direct edit
        if note.author == user:
            serializer = self.get_serializer(note, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            updated_note = serializer.save()
            # Clear any pending edit requests
            note.edit_requested_by = None
            note.edit_approved_by = None
            note.pending_title = None
            note.pending_content = None
            note.save()
            # Send notification to partner
            if updated_note.is_shared and user.partner:
                send_notification_to_partner(
                    user,
                    'note_updated',
                    f'✏️ Note Updated by {user.username}',
                    f'"{updated_note.title}"',
                    note_id=updated_note.id
                )
            return Response(serializer.data)
        
        # Partner trying to edit - need approval
        # Check if edit already requested
        if note.edit_requested_by == user:
            return Response({
                'message': 'You have already requested to edit. Waiting for partner approval.',
                'edit_requested': True
            })
        
        # If no edit request exists, create one with pending changes
        if not note.edit_requested_by:
            note.edit_requested_by = user
            note.pending_title = request.data.get('title', note.title)
            note.pending_content = request.data.get('content', note.content)
            note.save()
            return Response({
                'message': 'Edit request sent. Waiting for partner approval.',
                'edit_requested': True
            })
        
        # If partner requested edit and author approves
        if note.edit_requested_by != user and note.author == user:
            # Apply pending changes
            note.title = note.pending_title or note.title
            note.content = note.pending_content or note.content
            note.edit_approved_by = user
            note.edit_requested_by = None
            note.pending_title = None
            note.pending_content = None
            note.save()
            serializer = self.get_serializer(note)
            return Response({
                'message': 'Edit approved and applied.',
                **serializer.data
            })
        
        return Response({'error': 'Invalid edit request'}, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, *args, **kwargs):
        note = self.get_object()
        user = request.user
        
        # Check if user is author or partner
        if note.author != user and (not user.partner or note.author != user.partner):
            return Response({'error': 'You do not have permission to delete this note'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # If no deletion request exists, create one
        if not note.deletion_requested_by:
            note.deletion_requested_by = user
            note.save()
            # Send notification to partner about deletion request
            if note.author != user and note.author.partner == user:
                # User is requesting deletion of partner's note
                send_notification_to_partner(
                    user,
                    'note_deletion_requested',
                    f'🗑️ {user.username} wants to delete a note',
                    f'"{note.title}"',
                    note_id=note.id
                )
            elif note.author == user and user.partner:
                # User is requesting deletion of their own note (shared with partner)
                send_notification_to_partner(
                    user,
                    'note_deletion_requested',
                    f'🗑️ {user.username} wants to delete a note',
                    f'"{note.title}"',
                    note_id=note.id
                )
            return Response({
                'message': 'Deletion request sent. Waiting for partner approval.',
                'deletion_requested': True
            })
        
        # If deletion already requested
        if note.deletion_requested_by == user:
            return Response({
                'message': 'You have already requested deletion. Waiting for partner approval.',
                'deletion_requested': True
            })
        
        # If partner requests deletion and user approves (or vice versa)
        if note.deletion_requested_by != user:
            # Both partners have approved - delete the note
            note.delete()
            return Response({'message': 'Note deleted successfully'})
        
        return Response({'error': 'Invalid deletion request'}, status=status.HTTP_400_BAD_REQUEST)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_note_like(request, note_id):
    """Like or unlike a note"""
    try:
        note = Note.objects.get(id=note_id)
        user = request.user
        
        # Check if user has access to this note
        if note.author != user and (not user.partner or note.author != user.partner):
            return Response({'error': 'You do not have permission to like this note'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Check if already liked
        like, created = NoteLike.objects.get_or_create(note=note, user=user)
        
        if not created:
            # Unlike - delete the like
            like.delete()
            return Response({'message': 'Note unliked', 'is_liked': False})
        else:
            # Like - send notification to note author if they are the partner
            if note.author != user:
                # User liked someone else's note - notify the author if they are partners
                if user.partner == note.author or note.author.partner == user:
                    send_notification_to_partner(
                        user,
                        'note_liked',
                        f'❤️ {user.username} liked your note',
                        f'"{note.title}"',
                        note_id=note.id
                    )
            return Response({'message': 'Note liked', 'is_liked': True})
            
    except Note.DoesNotExist:
        return Response({'error': 'Note not found'}, status=status.HTTP_404_NOT_FOUND)


class JournalEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Get own entries and partner's shared entries
        if user.partner:
            return JournalEntry.objects.filter(
                Q(author=user) | (Q(author=user.partner) & Q(is_shared=True))
            )
        return JournalEntry.objects.filter(author=user)

    def perform_create(self, serializer):
        entry = serializer.save(author=self.request.user)
        # Send notification to partner
        if entry.is_shared and self.request.user.partner:
            date_str = entry.date.strftime('%Y-%m-%d')
            send_notification_to_partner(
                self.request.user,
                'journal_created',
                f'📔 New Journal Entry from {self.request.user.username}',
                f'Entry for {date_str}',
                journal_date=date_str
            )


class JournalEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Get own entries and partner's shared entries
        if user.partner:
            return JournalEntry.objects.filter(
                Q(author=user) | (Q(author=user.partner) & Q(is_shared=True))
            )
        return JournalEntry.objects.filter(author=user)
    
    def update(self, request, *args, **kwargs):
        entry = self.get_object()
        user = request.user
        
        # Check if user is author or partner
        if entry.author != user and (not user.partner or entry.author != user.partner):
            return Response({'error': 'You do not have permission to edit this entry'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # If user is the author, allow direct edit
        if entry.author == user:
            serializer = self.get_serializer(entry, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            updated_entry = serializer.save()
            # Clear any pending edit requests
            entry.edit_requested_by = None
            entry.edit_approved_by = None
            entry.pending_title = None
            entry.pending_content = None
            entry.save()
            # Send notification to partner
            if updated_entry.is_shared and user.partner:
                date_str = updated_entry.date.strftime('%Y-%m-%d')
                send_notification_to_partner(
                    user,
                    'journal_updated',
                    f'✏️ Journal Updated by {user.username}',
                    f'Entry for {date_str}',
                    journal_date=date_str
                )
            return Response(serializer.data)
        
        # Partner trying to edit - need approval
        # Check if edit already requested
        if entry.edit_requested_by == user:
            return Response({
                'message': 'You have already requested to edit. Waiting for partner approval.',
                'edit_requested': True
            })
        
        # If no edit request exists, create one with pending changes
        if not entry.edit_requested_by:
            entry.edit_requested_by = user
            entry.pending_title = request.data.get('title', entry.title)
            entry.pending_content = request.data.get('content', entry.content)
            entry.save()
            return Response({
                'message': 'Edit request sent. Waiting for partner approval.',
                'edit_requested': True
            })
        
        # If partner requested edit and author approves
        if entry.edit_requested_by != user and entry.author == user:
            # Apply pending changes
            entry.title = entry.pending_title or entry.title
            entry.content = entry.pending_content or entry.content
            entry.edit_approved_by = user
            entry.edit_requested_by = None
            entry.pending_title = None
            entry.pending_content = None
            entry.save()
            serializer = self.get_serializer(entry)
            return Response({
                'message': 'Edit approved and applied.',
                **serializer.data
            })
        
        return Response({'error': 'Invalid edit request'}, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, *args, **kwargs):
        entry = self.get_object()
        user = request.user
        
        # Check if user is author or partner
        if entry.author != user and (not user.partner or entry.author != user.partner):
            return Response({'error': 'You do not have permission to delete this entry'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # If no deletion request exists, create one
        if not entry.deletion_requested_by:
            entry.deletion_requested_by = user
            entry.save()
            # Send notification to partner about deletion request
            date_str = entry.date.strftime('%Y-%m-%d')
            if entry.author != user and entry.author.partner == user:
                # User is requesting deletion of partner's journal entry
                send_notification_to_partner(
                    user,
                    'journal_deletion_requested',
                    f'🗑️ {user.username} wants to delete a journal entry',
                    f'Entry for {date_str}',
                    journal_date=date_str
                )
            elif entry.author == user and user.partner:
                # User is requesting deletion of their own journal entry (shared with partner)
                send_notification_to_partner(
                    user,
                    'journal_deletion_requested',
                    f'🗑️ {user.username} wants to delete a journal entry',
                    f'Entry for {date_str}',
                    journal_date=date_str
                )
            return Response({
                'message': 'Deletion request sent. Waiting for partner approval.',
                'deletion_requested': True
            })
        
        # If deletion already requested
        if entry.deletion_requested_by == user:
            return Response({
                'message': 'You have already requested deletion. Waiting for partner approval.',
                'deletion_requested': True
            })
        
        # If partner requests deletion and user approves (or vice versa)
        if entry.deletion_requested_by != user:
            # Both partners have approved - delete the entry
            entry.delete()
            return Response({'message': 'Journal entry deleted successfully'})
        
        return Response({'error': 'Invalid deletion request'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def journal_entries_by_date(request):
    date = request.query_params.get('date')
    if date:
        user = request.user
        # Get own entries and partner's shared entries for the date
        if user.partner:
            entries = JournalEntry.objects.filter(
                Q(date=date) & (
                    Q(author=user) | (Q(author=user.partner) & Q(is_shared=True))
                )
            )
        else:
            entries = JournalEntry.objects.filter(author=user, date=date)
        return Response(JournalEntrySerializer(entries, many=True).data)
    return Response({'error': 'Date parameter is required'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_vapid_public_key(request):
    """Get VAPID public key for push subscription"""
    from django.conf import settings
    if not settings.VAPID_PUBLIC_KEY:
        return Response({'error': 'VAPID keys not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({'publicKey': settings.VAPID_PUBLIC_KEY})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_push_subscription(request):
    """Save Web Push subscription for the user"""
    try:
        endpoint = request.data.get('endpoint')
        keys = request.data.get('keys', {})
        p256dh = keys.get('p256dh')
        auth = keys.get('auth')
        
        if not endpoint or not p256dh or not auth:
            return Response({'error': 'Missing subscription data'}, status=status.HTTP_400_BAD_REQUEST)
        
        subscription, created = PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={
                'p256dh': p256dh,
                'auth': auth
            }
        )
        
        return Response({
            'message': 'Subscription saved successfully',
            'id': subscription.id
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_push_subscription(request, subscription_id):
    """Delete a push subscription"""
    try:
        subscription = PushSubscription.objects.get(id=subscription_id, user=request.user)
        subscription.delete()
        return Response({'message': 'Subscription deleted successfully'})
    except PushSubscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def partner_profile_view(request):
    if not request.user.partner:
        return Response({'error': 'No partner connected'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        partner_profile = UserProfile.objects.get(user=request.user.partner)
        serializer = PartnerProfileSerializer(partner_profile)
        return Response(serializer.data)
    except UserProfile.DoesNotExist:
        return Response({'error': 'Partner profile not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disconnect_partner(request):
    if not request.user.partner:
        return Response({'error': 'No partner connected'}, status=status.HTTP_400_BAD_REQUEST)
    
    partner = request.user.partner
    request.user.partner = None
    partner.partner = None
    request.user.save()
    partner.save()
    
    return Response({'message': 'Partner disconnected successfully'})


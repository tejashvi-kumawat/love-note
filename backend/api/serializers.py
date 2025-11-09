from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, Note, JournalEntry, PartnerRequest, UserProfile, NoteLike


class UserSerializer(serializers.ModelSerializer):
    partner = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'partner_code', 'partner')
    
    def get_partner(self, obj):
        if obj.partner:
            return {
                'id': obj.partner.id,
                'username': obj.partner.username,
                'email': obj.partner.email,
            }
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        import secrets
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
        )
        user.set_password(validated_data['password'])
        user.partner_code = secrets.token_urlsafe(8)
        user.save()
        return user


class NoteLikeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = NoteLike
        fields = ('id', 'user', 'created_at')
        read_only_fields = ('user', 'created_at')


class NoteSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    deletion_requested_by = UserSerializer(read_only=True)
    deletion_approved_by = UserSerializer(read_only=True)
    edit_requested_by = UserSerializer(read_only=True)
    edit_approved_by = UserSerializer(read_only=True)
    likes = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    is_liked_by_current_user = serializers.SerializerMethodField()
    
    class Meta:
        model = Note
        fields = ('id', 'title', 'content', 'author', 'created_at', 'updated_at', 'is_shared', 
                  'deletion_requested_by', 'deletion_approved_by', 'edit_requested_by', 'edit_approved_by',
                  'pending_title', 'pending_content', 'likes', 'like_count', 'is_liked_by_current_user')
        read_only_fields = ('author', 'created_at', 'updated_at')
    
    def get_likes(self, obj):
        try:
            likes = obj.likes.all()
            return NoteLikeSerializer(likes, many=True).data
        except Exception:
            # Handle case where NoteLike table doesn't exist yet (migration not run)
            return []
    
    def get_like_count(self, obj):
        try:
            return obj.likes.count()
        except Exception:
            # Handle case where NoteLike table doesn't exist yet (migration not run)
            return 0
    
    def get_is_liked_by_current_user(self, obj):
        try:
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                return obj.likes.filter(user=request.user).exists()
        except Exception:
            # Handle case where NoteLike table doesn't exist yet (migration not run)
            pass
        return False


class JournalEntrySerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    deletion_requested_by = UserSerializer(read_only=True)
    deletion_approved_by = UserSerializer(read_only=True)
    edit_requested_by = UserSerializer(read_only=True)
    edit_approved_by = UserSerializer(read_only=True)
    
    class Meta:
        model = JournalEntry
        fields = ('id', 'title', 'content', 'author', 'date', 'created_at', 'updated_at', 'mood', 'is_shared',
                  'deletion_requested_by', 'deletion_approved_by', 'edit_requested_by', 'edit_approved_by',
                  'pending_title', 'pending_content')
        read_only_fields = ('author', 'created_at', 'updated_at')


class PartnerRequestSerializer(serializers.ModelSerializer):
    requester = UserSerializer(read_only=True)
    requested = UserSerializer(read_only=True)
    
    class Meta:
        model = PartnerRequest
        fields = ('id', 'requester', 'requested', 'status', 'created_at')
        read_only_fields = ('requester', 'created_at')


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('user', 'updated_at')


class PartnerProfileSerializer(serializers.ModelSerializer):
    """Serializer for partner's profile - automatically shows all fields"""
    class Meta:
        model = UserProfile
        fields = (
            'bio', 'birthday', 'location', 'phone', 'favorite_color',
            'favorite_food', 'favorite_movie', 'favorite_song', 'favorite_place',
            'hobbies', 'relationship_anniversary', 'love_language', 'personal_notes'
        )


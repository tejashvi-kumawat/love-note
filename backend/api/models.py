from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    email = models.EmailField(unique=True)
    partner_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    partner = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='partnered_with')
    
    def __str__(self):
        return self.username


class PartnerRequest(models.Model):
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_requests')
    requested = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_requests')
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected')
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)


class Note(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_shared = models.BooleanField(default=True)  # Shared with partner
    deletion_requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deletion_requests')
    deletion_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deletion_approvals')
    edit_requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='edit_requests', help_text='User who requested to edit')
    edit_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='edit_approvals', help_text='User who approved the edit')
    pending_title = models.CharField(max_length=200, blank=True, null=True, help_text='Pending title change')
    pending_content = models.TextField(blank=True, null=True, help_text='Pending content change')
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return self.title


class NoteLike(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='note_likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['note', 'user']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} likes {self.note.title}"


class JournalEntry(models.Model):
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal_entries')
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    mood = models.CharField(max_length=50, blank=True)
    is_shared = models.BooleanField(default=True)  # Shared with partner
    deletion_requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_deletion_requests')
    deletion_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_deletion_approvals')
    edit_requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_edit_requests', help_text='User who requested to edit')
    edit_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_edit_approvals', help_text='User who approved the edit')
    pending_title = models.CharField(max_length=200, blank=True, null=True, help_text='Pending title change')
    pending_content = models.TextField(blank=True, null=True, help_text='Pending content change')
    
    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = ['author', 'date']
    
    def __str__(self):
        return f"{self.author.username} - {self.date}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    birthday = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    favorite_color = models.CharField(max_length=50, blank=True)
    favorite_food = models.CharField(max_length=100, blank=True)
    favorite_movie = models.CharField(max_length=200, blank=True)
    favorite_song = models.CharField(max_length=200, blank=True)
    favorite_place = models.CharField(max_length=200, blank=True)
    hobbies = models.TextField(blank=True)
    relationship_anniversary = models.DateField(null=True, blank=True)
    love_language = models.CharField(max_length=100, blank=True)
    personal_notes = models.TextField(blank=True)
    
    # Shareable fields flags
    share_bio = models.BooleanField(default=False)
    share_birthday = models.BooleanField(default=False)
    share_location = models.BooleanField(default=False)
    share_phone = models.BooleanField(default=False)
    share_favorite_color = models.BooleanField(default=False)
    share_favorite_food = models.BooleanField(default=False)
    share_favorite_movie = models.BooleanField(default=False)
    share_favorite_song = models.BooleanField(default=False)
    share_favorite_place = models.BooleanField(default=False)
    share_hobbies = models.BooleanField(default=False)
    share_relationship_anniversary = models.BooleanField(default=False)
    share_love_language = models.BooleanField(default=False)
    share_personal_notes = models.BooleanField(default=False)
    
    # Notification preferences
    notifications_enabled = models.BooleanField(default=False, help_text='Enable browser notifications')
    notify_note_created = models.BooleanField(default=True, help_text='Notify when partner creates a note')
    notify_note_updated = models.BooleanField(default=True, help_text='Notify when partner updates a note')
    notify_note_liked = models.BooleanField(default=True, help_text='Notify when partner likes a note')
    notify_journal_created = models.BooleanField(default=True, help_text='Notify when partner creates a journal entry')
    notify_journal_updated = models.BooleanField(default=True, help_text='Notify when partner updates a journal entry')
    notify_journal_reminder = models.BooleanField(default=True, help_text='Enable nightly journal reminder notifications')
    journal_reminder_time = models.TimeField(default='21:00:00', help_text='Time for nightly journal reminder (24-hour format)')
    
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"


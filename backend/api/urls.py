from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/me/', views.current_user, name='current_user'),
    path('auth/connect-partner/', views.connect_partner, name='connect_partner'),
    path('auth/disconnect-partner/', views.disconnect_partner, name='disconnect_partner'),
    
    path('profile/', views.profile_view, name='profile'),
    path('profile/partner/', views.partner_profile_view, name='partner-profile'),
    
    path('push/vapid-public-key/', views.get_vapid_public_key, name='vapid-public-key'),
    path('push/subscribe/', views.save_push_subscription, name='push-subscribe'),
    path('push/unsubscribe/<int:subscription_id>/', views.delete_push_subscription, name='push-unsubscribe'),
    
    path('notes/', views.NoteListCreateView.as_view(), name='note-list-create'),
    path('notes/<int:pk>/', views.NoteDetailView.as_view(), name='note-detail'),
    path('notes/<int:note_id>/like/', views.toggle_note_like, name='note-like'),
    
    path('journal/', views.JournalEntryListCreateView.as_view(), name='journal-list-create'),
    path('journal/<int:pk>/', views.JournalEntryDetailView.as_view(), name='journal-detail'),
    path('journal/by-date/', views.journal_entries_by_date, name='journal-by-date'),
]


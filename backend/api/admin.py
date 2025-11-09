from django.contrib import admin
from .models import User, Note, JournalEntry, PartnerRequest, UserProfile

admin.site.register(User)
admin.site.register(Note)
admin.site.register(JournalEntry)
admin.site.register(PartnerRequest)
admin.site.register(UserProfile)


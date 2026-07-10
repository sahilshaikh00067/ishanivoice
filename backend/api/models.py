from django.db import models


# ===============================
# 👤 USER MODEL
# ===============================
class User(models.Model):

    ROLE_CHOICES = (
        ("admin",    "Admin"),
        ("reseller", "Reseller"),
        ("user",     "User"),
    )

    username = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=255)
    role     = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")

    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="children"
    )

    credit = models.IntegerField(default=0)
    status = models.CharField(max_length=10, default="Active")

    # VoiceChannel Credentials
    vc_username  = models.CharField(max_length=100, blank=True, null=True)
    vc_password  = models.CharField(max_length=255, blank=True, null=True)
    vc_caller_id = models.CharField(max_length=20,  blank=True, null=True)
    vc_plan_id   = models.CharField(max_length=10,  default="2")
    vc_call_type = models.CharField(max_length=10,  default="2")

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.credit < 0:
            self.credit = 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"


# ===============================
# 📞 CALLER ID MODEL
# ===============================
class CallerID(models.Model):
    user      = models.ForeignKey(User, on_delete=models.CASCADE, related_name="caller_ids")
    name      = models.CharField(max_length=100)          # e.g. "Main Number"
    number    = models.CharField(max_length=20)            # e.g. "+918071943020"
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} — {self.number}"


# ===============================
# 🎙️ VOICE MEDIA FILE
# ===============================
class VoiceMediaFile(models.Model):

    STATUS_CHOICES = (
        ("Pending",  "Pending"),
        ("Approved", "Approved"),
    )

    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name="media_files")
    name          = models.CharField(max_length=255)
    voice_file_id = models.CharField(max_length=50, blank=True)
    media_url     = models.URLField(max_length=500)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.voice_file_id})"


# ===============================
# 📢 VOICE CAMPAIGN
# ===============================
class VoiceCampaign(models.Model):

    STATUS_CHOICES = (
        ("pending",   "Pending"),
        ("scheduled", "Scheduled"),
        ("running",   "Running"),
        ("done",      "Done"),
        ("failed",    "Failed"),
    )

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="voice_campaigns")
    name       = models.CharField(max_length=255, default="Untitled Campaign")
    media_file = models.ForeignKey(VoiceMediaFile, on_delete=models.SET_NULL, null=True, blank=True)

    voice_file_id = models.CharField(max_length=50,  blank=True)
    caller_id     = models.CharField(max_length=20,  blank=True)
    plan_id       = models.CharField(max_length=10,  default="2")
    call_type     = models.CharField(max_length=10,  default="2")

    total   = models.IntegerField(default=0)
    success = models.IntegerField(default=0)
    failed  = models.IntegerField(default=0)
    nonwa   = models.IntegerField(default=0)

    job_id  = models.CharField(max_length=100, blank=True)
    results = models.JSONField(default=list)
    status  = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    scheduled_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Campaign #{self.id} - {self.name}"
    

#Voice Response

class VoiceCampaignResponse(models.Model):
    campaign = models.ForeignKey(
        VoiceCampaign,
        on_delete=models.CASCADE,
        related_name="responses"
    )

    mobile = models.CharField(max_length=20)
    dtmf = models.CharField(max_length=5)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.mobile} -> {self.dtmf}"


# ===============================
# 💰 CREDIT HISTORY
# ===============================
class CreditHistory(models.Model):

    TYPE_CHOICES = (
        ("credit", "Credit"),
        ("debit",  "Debit"),
    )

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="credit_history")
    amount     = models.IntegerField(default=0)
    type       = models.CharField(max_length=20, choices=TYPE_CHOICES)
    remarks    = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_credit_logs")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.type} - {self.amount}"
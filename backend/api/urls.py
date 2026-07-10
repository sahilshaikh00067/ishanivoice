from django.urls import path
from . import views

urlpatterns = [

    # AUTH
    path("login/", views.login),

    # USER MANAGEMENT
    path("create-user/",     views.create_user),
    path("update-user/",     views.update_user),
    path("delete-user/",     views.delete_user),
    path("toggle-status/",   views.toggle_user_status),
    path("reset-password/",  views.reset_password),
    path("change-password/", views.change_password),
    path("list-users/",      views.list_users),

    # CALLER IDs
    path("add-caller-id/",    views.add_caller_id),
    path("get-caller-ids/",   views.get_caller_ids),
    path("delete-caller-id/", views.delete_caller_id),

    # MEDIA FILES
    path("upload-media/",    views.upload_media),
    path("approve-media/",   views.approve_media),
    path("update-media-id/", views.update_media_id),
    path("get-media-files/", views.get_media_files),
    path("delete-media/",    views.delete_media),

    # VOICE CAMPAIGNS
    path("send-bulk-voice/",     views.send_bulk_voice),
    path("schedule-campaign/",   views.schedule_campaign),
    path("get-campaigns/",       views.get_campaigns),
    path("get-campaign-detail/", views.get_campaign_detail),
    path("obd-dtmf-callback/",views.obd_dtmf_callback),

    # CREDIT
    path("credit-history/", views.credit_history),
]
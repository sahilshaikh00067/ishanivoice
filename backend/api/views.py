import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from django.utils.dateparse import parse_datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import (
    User,
    CallerID,
    VoiceMediaFile,
    VoiceCampaign,
    VoiceCampaignResponse,
    CreditHistory,
)

# =====================================
# OBD API CONFIG
# =====================================
OBD_API_URL    = "https://154.210.187.101/OBDAPI/webresources/CreateOBDCampaignPost"
OBD_UKEY       = "rEfOPQTLgdO7uoa2Cl0WVZaeC"
OBD_SERVICE_NO = "8071943020"


# =====================================
# CHATWAY WHATSAPP NOTIFY CONFIG
# =====================================
CHATWAY_USERNAME      = "APIDEMO"
CHATWAY_TOKEN         = "aHFOQllaL1JhSUhjbnlMZWN4YTEwZz09"
CHATWAY_SEND_URL      = "https://int.chatway.in/api/send-msg"
ADMIN_WHATSAPP_NUMBER = "918381845350"


def send_whatsapp_notification(message, number=ADMIN_WHATSAPP_NUMBER):
    """Sends a WhatsApp text message via Chatway API. Never raises — logs and returns bool."""
    try:
        params = {
            "username": CHATWAY_USERNAME,
            "number"  : number,
            "message" : message,
            "token"   : CHATWAY_TOKEN,
        }
        resp = requests.get(CHATWAY_SEND_URL, params=params, timeout=15)
        print(f"WHATSAPP NOTIFY -> status={resp.status_code} body={resp.text}")
        return resp.status_code == 200
    except Exception as e:
        print("WHATSAPP NOTIFY ERROR:", e)
        return False


# =====================================
# CLEAN NUMBER
# =====================================
def clean_number(number):
    num    = str(number).strip()
    digits = ''.join(filter(str.isdigit, num))
    if not digits:
        return None
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10:
        return None
    return digits


# =====================================
# OBD DTMF CALLBACK  (REPLACE THE OLD ONE WITH THIS)
# =====================================
@api_view(["POST"])
def obd_dtmf_callback(request):

    print("=== OBD DTMF CALLBACK RAW DATA ===", request.data)

    # Provider may send the campaign reference under different keys
    # depending on template/version: job_id, leadid, refno, campaignid.
    # We try all known variants instead of assuming only "job_id".
    job_id = (
        request.data.get("job_id")
        or request.data.get("jobid")
        or request.data.get("leadid")
        or request.data.get("lead_id")
        or request.data.get("refno")
        or request.data.get("campaignid")
        or request.data.get("campaign_id")
    )

    # Mobile number may also come under different keys
    mobile = (
        request.data.get("mobile")
        or request.data.get("msisdn")
        or request.data.get("phoneno")
        or request.data.get("phone")
    )

    # DTMF key may also vary
    dtmf = (
        request.data.get("dtmf")
        or request.data.get("dtmf_input")
        or request.data.get("keypress")
        or request.data.get("digits")
    )

    if not mobile or dtmf is None:
        print("OBD DTMF CALLBACK: missing mobile or dtmf in payload:", request.data)
        return Response({"status": "failed", "message": "mobile/dtmf missing"})

    campaign = None
    if job_id:
        campaign = VoiceCampaign.objects.filter(job_id=str(job_id)).first()

    # Fallback: if job_id didn't match anything, try matching by mobile
    # against the most recent running/done campaign that contains this number.
    if not campaign:
        campaign = (
            VoiceCampaign.objects
            .filter(results__icontains=clean_number(mobile) or mobile)
            .order_by("-id")
            .first()
        )

    VoiceCampaignResponse.objects.create(
        campaign=campaign,   # can be None if truly unmatched; saved anyway so no data is lost
        mobile=mobile,
        dtmf=str(dtmf),
    )

    print(
        f"OBD DTMF SAVED -> mobile={mobile} dtmf={dtmf} "
        f"matched_campaign={campaign.id if campaign else 'UNMATCHED'} raw_job_id={job_id}"
    )

    return Response({"status": "success"})


# =====================================
# MAKE BULK OBD CALL
# =====================================
def make_bulk_obd_call(numbers, voice_file, retry_attempt="0", retry_duration="0"):
    payload = {
        "sourcetype"    : "0",
        "campaigntype"  : "4",
        "filetype"      : "2",
        "voicefile"     : voice_file,
        "ukey"          : OBD_UKEY,
        "serviceno"     : OBD_SERVICE_NO,
        "ivrtemplateid" : "1",
        "retryduration" : str(retry_duration),
        "msisdn"        : numbers,
    }
    try:
        response = requests.post(OBD_API_URL, json=payload, verify=False, timeout=30)
        result   = response.json()
        print(f"=== OBD BULK CALL === numbers={len(numbers)} response={result}")
 
        # Explicit failure check
        if str(result.get("status", "")).lower() == "failure" or \
           str(result.get("Status", "")).lower() == "failure":
            print("OBD API returned failure:", result)
            return None

        job_id = (
            result.get("leadid")     or
            result.get("campaignid") or
            result.get("jobid")      or
            result.get("id")         or
            result.get("requestid")
        )

# Success check — OBD returns status: success
        obd_success = str(result.get("status", "")).lower() == "success"
        return str(job_id) if (response.status_code == 200 and obd_success and job_id) else None

    except Exception as e:
        print("OBD BULK CALL ERROR:", e)
        return None


# =====================================
# LOGIN
# =====================================
@api_view(['POST'])
def login(request):
    try:
        user = User.objects.filter(
            username=request.data.get("username"),
            password=request.data.get("password")
        ).first()

        if not user:
            return Response({"status": "failed", "message": "Invalid Login"})
        if user.status != "Active":
            return Response({"status": "failed", "message": "Account Disabled"})

        return Response({
            "status"   : "success",
            "user_id"  : user.id,
            "username" : user.username,
            "role"     : user.role,
            "credit"   : user.credit,
            "caller_id": user.vc_caller_id or "",
        })
    except Exception as e:
        print("LOGIN ERROR:", e)
        return Response({"status": "error"})


# =====================================
# CREATE USER
# =====================================
@api_view(['POST'])
def create_user(request):
    try:
        username        = request.data.get("username")
        password        = request.data.get("password")
        role            = request.data.get("role", "user")
        parent_username = request.data.get("parent")

        if not username or not password:
            return Response({"status": "failed", "message": "Missing Fields"})
        if User.objects.filter(username=username).exists():
            return Response({"status": "failed", "message": "User Already Exists"})

        parent = None
        if parent_username:
            parent = User.objects.filter(username=parent_username).first()

        user = User.objects.create(
            username=username, password=password,
            role=role, parent=parent, credit=0, status="Active"
        )
        return Response({"status": "success", "user_id": user.id})
    except Exception as e:
        print("CREATE USER ERROR:", e)
        return Response({"status": "error"})


# =====================================
# UPDATE USER
# =====================================
@api_view(['POST'])
def update_user(request):
    try:
        user     = User.objects.get(id=request.data.get("user_id"))
        admin_id = request.data.get("admin_id")
        admin    = User.objects.filter(id=admin_id).first()

        add_credit = request.data.get("add_credit", 0)
        if add_credit in ["", None]:
            add_credit = 0
        add_credit = int(add_credit)

        user.username     = request.data.get("username",     user.username)
        user.role         = request.data.get("role",         user.role)
        user.vc_username  = request.data.get("vc_username",  user.vc_username)
        user.vc_password  = request.data.get("vc_password",  user.vc_password)
        user.vc_caller_id = request.data.get("vc_caller_id", user.vc_caller_id)
        user.vc_plan_id   = request.data.get("vc_plan_id",   user.vc_plan_id)
        user.vc_call_type = request.data.get("vc_call_type", user.vc_call_type)

        if request.data.get("password"):
            user.password = request.data.get("password")
        if request.data.get("status"):
            user.status = request.data.get("status")

        if add_credit > 0:
            user.credit += add_credit
            CreditHistory.objects.create(
                user=user, amount=add_credit, type="credit",
                remarks=f"{add_credit} Credits Added By {admin.username if admin else 'Admin'}",
                created_by=admin
            )
        elif add_credit < 0:
            remove_amount = abs(add_credit)
            user.credit  -= remove_amount
            if user.credit < 0:
                user.credit = 0
            CreditHistory.objects.create(
                user=user, amount=remove_amount, type="debit",
                remarks=f"{remove_amount} Credits Removed By {admin.username if admin else 'Admin'}",
                created_by=admin
            )

        user.save()
        return Response({"status": "success", "credit": user.credit})
    except Exception as e:
        print("UPDATE USER ERROR:", e)
        return Response({"status": "error", "message": str(e)})


# =====================================
# DELETE USER
# =====================================
@api_view(['POST'])
def delete_user(request):
    try:
        user = User.objects.get(id=request.data.get("user_id"))
        user.delete()
        return Response({"status": "success"})
    except Exception as e:
        print("DELETE USER ERROR:", e)
        return Response({"status": "error"})


# =====================================
# TOGGLE STATUS
# =====================================
@api_view(['POST'])
def toggle_user_status(request):
    try:
        user        = User.objects.get(id=request.data.get("user_id"))
        user.status = "Deactive" if user.status == "Active" else "Active"
        user.save()
        return Response({"status": "success", "new_status": user.status})
    except Exception as e:
        print("TOGGLE STATUS ERROR:", e)
        return Response({"status": "error"})


# =====================================
# RESET PASSWORD
# =====================================
@api_view(['POST'])
def reset_password(request):
    try:
        user          = User.objects.get(id=request.data.get("user_id"))
        user.password = request.data.get("password")
        user.save()
        return Response({"status": "success"})
    except Exception as e:
        print("RESET PASSWORD ERROR:", e)
        return Response({"status": "error"})


# =====================================
# CALLER ID — ADD
# =====================================
@api_view(['POST'])
def add_caller_id(request):
    try:
        user   = User.objects.get(id=request.data.get("user_id"))
        name   = request.data.get("name", "").strip()
        number = request.data.get("number", "").strip()

        if not name or not number:
            return Response({"status": "failed", "message": "Name and Number required"})

        obj = CallerID.objects.create(user=user, name=name, number=number)
        return Response({"status": "success", "id": obj.id})
    except Exception as e:
        print("ADD CALLER ID ERROR:", e)
        return Response({"status": "error", "message": str(e)})


# =====================================
# CALLER ID — GET LIST
# =====================================
@api_view(['GET'])
def get_caller_ids(request):
    try:
        user = User.objects.get(id=request.GET.get("user_id"))

        if user.role == "admin":
            ids = CallerID.objects.all().order_by("-id")
        else:
            ids = CallerID.objects.filter(user=user).order_by("-id")

        data = [{"id": c.id, "name": c.name, "number": c.number} for c in ids]
        return Response(data)
    except Exception as e:
        print("GET CALLER IDS ERROR:", e)
        return Response([])


# =====================================
# CALLER ID — DELETE
# =====================================
@api_view(['POST'])
def delete_caller_id(request):
    try:
        obj = CallerID.objects.get(id=request.data.get("caller_id"))
        obj.delete()
        return Response({"status": "success"})
    except Exception as e:
        print("DELETE CALLER ID ERROR:", e)
        return Response({"status": "error"})


# =====================================
# UPLOAD MEDIA  (status=Pending + WhatsApp notify)
# =====================================
@api_view(['POST'])
def upload_media(request):
    try:
        user       = User.objects.get(id=request.data.get("user_id"))
        name       = request.data.get("name", "Untitled")
        voice_file = (
            request.data.get("voice_file") or
            request.data.get("media_url")  or ""
        ).strip()

        if not voice_file:
            return Response({"status": "failed", "message": "Voice filename required"})

        media_obj = VoiceMediaFile.objects.create(
            user=user, name=name,
            voice_file_id=voice_file, media_url=voice_file,
            status="Pending",
        )

        # Notify admin on WhatsApp — never blocks the response if it fails
        notify_msg = (
            f"🔔 New Voice File Uploaded\n\n"
            f"Name: {name}\n"
            f"File: {voice_file}\n"
            f"By: {user.username}\n\n"
            f"Login to admin panel to approve."
        )
        send_whatsapp_notification(notify_msg)

        return Response({"status": "success", "media_id": media_obj.id})
    except Exception as e:
        print("UPLOAD MEDIA ERROR:", e)
        return Response({"status": "error", "message": str(e)})


# =====================================
# APPROVE MEDIA (admin only)
# =====================================
@api_view(['POST'])
def approve_media(request):
    try:
        admin_id = request.data.get("admin_id")
        admin    = User.objects.filter(id=admin_id).first()

        if not admin or admin.role != "admin":
            return Response({"status": "failed", "message": "Not authorized"})

        media_obj        = VoiceMediaFile.objects.get(id=request.data.get("media_id"))
        media_obj.status = "Approved"
        media_obj.save()

        return Response({"status": "success", "media_id": media_obj.id})
    except Exception as e:
        print("APPROVE MEDIA ERROR:", e)
        return Response({"status": "error", "message": str(e)})


# =====================================
# UPDATE MEDIA ID
# =====================================
@api_view(['POST'])
def update_media_id(request):
    try:
        media_obj               = VoiceMediaFile.objects.get(id=request.data.get("media_id"))
        voice_file_id           = request.data.get("voice_file_id") or request.data.get("media_file_id", "")
        media_obj.voice_file_id = voice_file_id
        media_obj.save()
        return Response({"status": "success"})
    except Exception as e:
        print("UPDATE MEDIA ID ERROR:", e)
        return Response({"status": "error", "message": str(e)})


# =====================================
# GET MEDIA FILES
# only_approved=true  -> sirf Approved files (VoiceCampaign send page ke liye)
# default             -> apni saari files (Pending + Approved) — AudioFile management page ke liye
# =====================================
@api_view(['GET'])
def get_media_files(request):
    try:
        user          = User.objects.get(id=request.GET.get("user_id"))
        only_approved = request.GET.get("only_approved") == "true"

        files = VoiceMediaFile.objects.all().order_by("-id") if user.role == "admin" \
                else VoiceMediaFile.objects.filter(user=user).order_by("-id")

        if only_approved:
            files = files.filter(status="Approved")

        data = [{
            "id"           : f.id,
            "name"         : f.name,
            "voice_file_id": f.voice_file_id,
            "media_file_id": f.voice_file_id,
            "media_url"    : f.media_url,
            "status"       : f.status,
            "created_at"   : f.created_at.isoformat(),
        } for f in files]
        return Response(data)
    except Exception as e:
        print("GET MEDIA FILES ERROR:", e)
        return Response([])


# =====================================
# DELETE MEDIA
# =====================================
@api_view(['POST'])
def delete_media(request):
    try:
        VoiceMediaFile.objects.get(id=request.data.get("media_id")).delete()
        return Response({"status": "success"})
    except Exception as e:
        print("DELETE MEDIA ERROR:", e)
        return Response({"status": "error"})


# =====================================
# SEND BULK VOICE
# =====================================
@api_view(['POST'])
def send_bulk_voice(request):
    try:
        user        = User.objects.get(id=request.data.get("user_id"))
        raw_numbers = request.data.get("numbers", [])
        if isinstance(raw_numbers, str):
            raw_numbers = [n.strip() for n in raw_numbers.split(",") if n.strip()]

        media_file_id  = str(request.data.get("media_file_id", "")).strip()
        if "/" in media_file_id:
            media_file_id = media_file_id.split("/")[-1]

        caller_id      = str(request.data.get("caller_id", OBD_SERVICE_NO)).strip()
        plan_id        = str(request.data.get("plan_id",   "2")).strip()
        call_type      = str(request.data.get("call_type", "2")).strip()
        retry_attempt  = str(request.data.get("retry_attempt",  "0")).strip()
        retry_duration = str(request.data.get("retry_duration", "0")).strip()
        campaign_name  = request.data.get("campaign_name", "Untitled Campaign")

        if not media_file_id:
            return Response({"status": "failed", "message": "Voice File Required"})

        valid_numbers, invalid_results = [], []
        for raw in raw_numbers:
            cleaned = clean_number(raw)
            if cleaned:
                valid_numbers.append(cleaned)
            else:
                invalid_results.append({"number": raw, "status": "invalid"})

        if not valid_numbers:
            return Response({"status": "failed", "message": "No Valid Numbers"})

        if user.role != "admin" and user.credit < len(valid_numbers):
            return Response({"status": "failed", "message": "Insufficient Credit"})

        campaign = VoiceCampaign.objects.create(
            user=user, name=campaign_name,
            voice_file_id=media_file_id, caller_id=caller_id,
            plan_id=plan_id, call_type=call_type,
            total=len(valid_numbers), status="running",
        )

        job_id = make_bulk_obd_call(valid_numbers, media_file_id, retry_attempt, retry_duration)

        if job_id:
            results       = [{"number": n, "status": "sent", "job_id": job_id} for n in valid_numbers]
            success_count = len(valid_numbers)
            failed_count  = 0
        else:
            results       = [{"number": n, "status": "failed", "error": "OBD API error"} for n in valid_numbers]
            success_count = 0
            failed_count  = len(valid_numbers)

        results += invalid_results
        invalid_count = len(invalid_results)

        campaign.success = success_count
        campaign.failed  = failed_count
        campaign.nonwa   = invalid_count
        campaign.job_id  = str(job_id) if job_id else ""
        campaign.results = results
        campaign.status  = "done"
        campaign.save()

        if success_count > 0 and user.role != "admin":
            user.credit -= success_count
            if user.credit < 0:
                user.credit = 0
            user.save()
            CreditHistory.objects.create(
                user=user, amount=success_count, type="debit",
                remarks=f"{success_count} Credits Debited For Voice Campaign — {campaign_name}"
            )

        return Response({
            "status"     : "done",
            "campaign_id": campaign.id,
            "total"      : len(valid_numbers),
            "success"    : success_count,
            "failed"     : failed_count,
            "invalid"    : invalid_count,
            "job_id"     : str(job_id) if job_id else "",
            "results"    : results,
        })
    except Exception as e:
        print("SEND BULK VOICE ERROR:", e)
        return Response({"status": "error", "message": str(e)})


# =====================================
# SCHEDULE CAMPAIGN
# =====================================
@api_view(['POST'])
def schedule_campaign(request):
    try:
        user        = User.objects.get(id=request.data.get("user_id"))
        raw_numbers = request.data.get("numbers", [])
        if isinstance(raw_numbers, str):
            raw_numbers = [n.strip() for n in raw_numbers.split(",") if n.strip()]

        media_file_id = str(request.data.get("media_file_id", "")).strip()
        if "/" in media_file_id:
            media_file_id = media_file_id.split("/")[-1]

        caller_id             = str(request.data.get("caller_id", OBD_SERVICE_NO)).strip()
        plan_id               = str(request.data.get("plan_id",   "2")).strip()
        call_type              = str(request.data.get("call_type", "2")).strip()
        campaign_name          = request.data.get("campaign_name", "Scheduled Campaign")
        schedule_datetime_str  = request.data.get("scheduled_at", "").strip()

        if not media_file_id:
            return Response({"status": "failed", "message": "Voice File Required"})
        if not schedule_datetime_str:
            return Response({"status": "failed", "message": "Schedule Date & Time Required"})

        try:
            scheduled_at = parse_datetime(schedule_datetime_str)
            if scheduled_at is None:
                raise ValueError()
        except Exception:
            return Response({"status": "failed", "message": "Invalid datetime format"})

        valid_numbers, invalid_results = [], []
        for raw in raw_numbers:
            cleaned = clean_number(raw)
            if cleaned:
                valid_numbers.append(cleaned)
            else:
                invalid_results.append({"number": raw, "status": "invalid"})

        if not valid_numbers:
            return Response({"status": "failed", "message": "No Valid Numbers"})
        if user.role != "admin" and user.credit < len(valid_numbers):
            return Response({"status": "failed", "message": "Insufficient Credit"})

        pending_results = [{"number": n, "status": "pending"} for n in valid_numbers] + invalid_results

        campaign = VoiceCampaign.objects.create(
            user=user, name=campaign_name,
            voice_file_id=media_file_id, caller_id=caller_id,
            plan_id=plan_id, call_type=call_type,
            total=len(valid_numbers), nonwa=len(invalid_results),
            status="scheduled", scheduled_at=scheduled_at,
            results=pending_results,
        )

        return Response({
            "status"      : "scheduled",
            "campaign_id" : campaign.id,
            "total"       : len(valid_numbers),
            "scheduled_at": scheduled_at.isoformat(),
        })
    except Exception as e:
        print("SCHEDULE CAMPAIGN ERROR:", e)
        return Response({"status": "error", "message": str(e)})


# =====================================
# GET CAMPAIGNS
# =====================================
@api_view(['GET'])
def get_campaigns(request):
    try:
        user = User.objects.get(id=request.GET.get("user_id"))

        if user.role == "admin":
            campaigns = VoiceCampaign.objects.all().order_by("-id")
        elif user.role == "reseller":
            campaigns = VoiceCampaign.objects.filter(
                user__in=[user] + list(user.children.all())
            ).order_by("-id")
        else:
            campaigns = VoiceCampaign.objects.filter(user=user).order_by("-id")

        data = [{
            "id"           : c.id,
            "name"         : c.name,
            "voice_file_id": c.voice_file_id,
            "media_file_id": c.voice_file_id,
            "caller_id"    : c.caller_id,
            "plan_id"      : c.plan_id,
            "call_type"    : c.call_type,
            "total"        : c.total,
            "success"      : c.success,
            "failed"       : c.failed,
            "invalid"      : c.nonwa,
            "job_id"       : c.job_id,
            "status"       : c.status,
            "scheduled_at" : c.scheduled_at.isoformat() if c.scheduled_at else None,
            "created_at"   : c.created_at.isoformat(),
            "username"     : c.user.username,
            "results"      : c.results,
        } for c in campaigns]
        return Response(data)
    except Exception as e:
        print("GET CAMPAIGNS ERROR:", e)
        return Response([])


# =====================================
# GET CAMPAIGN DETAIL
# =====================================
@api_view(['GET'])
def get_campaign_detail(request):
    try:
        c = VoiceCampaign.objects.get(
            id=request.GET.get("campaign_id")
        )

        responses = [
            {
                "mobile": r.mobile,
                "dtmf": r.dtmf,
                "created_at": r.created_at.isoformat()
            }
            for r in c.responses.all()
        ]

        return Response({
            "id": c.id,
            "name": c.name,
            "voice_file_id": c.voice_file_id,
            "caller_id": c.caller_id,
            "plan_id": c.plan_id,
            "call_type": c.call_type,
            "total": c.total,
            "success": c.success,
            "failed": c.failed,
            "invalid": c.nonwa,
            "job_id": c.job_id,
            "status": c.status,
            "results": c.results,
            "responses": responses,
        })

    except VoiceCampaign.DoesNotExist:
        return Response(
            {"status": "failed", "message": "Campaign not found"},
            status=404
        )

# =====================================
# CHANGE PASSWORD (self-service, verifies current password)
# =====================================
@api_view(['POST'])
def change_password(request):
    try:
        user              = User.objects.get(id=request.data.get("user_id"))
        current_password  = request.data.get("current_password", "")
        new_password      = request.data.get("new_password", "")

        if not current_password or not new_password:
            return Response({"status": "failed", "message": "All fields required"})

        if user.password != current_password:
            return Response({"status": "failed", "message": "Current password incorrect"})

        if len(new_password) < 3:
            return Response({"status": "failed", "message": "New password must be at least 3 characters"})

        user.password = new_password
        user.save()
        return Response({"status": "success"})
    except User.DoesNotExist:
        return Response({"status": "failed", "message": "User not found"})
    except Exception as e:
        print("CHANGE PASSWORD ERROR:", e)
        return Response({"status": "error", "message": str(e)})


# =====================================
# LIST USERS (role-scoped: admin=all, reseller=self+children, user=self)
# =====================================
@api_view(['GET'])
def list_users(request):
    try:
        logged_user = User.objects.get(id=request.GET.get("user_id"))

        if logged_user.role == "admin":
            users = User.objects.all().order_by("-id")
        elif logged_user.role == "reseller":
            child_ids = list(logged_user.children.values_list("id", flat=True))
            users     = User.objects.filter(id__in=[logged_user.id] + child_ids).order_by("-id")
        else:
            users = User.objects.filter(id=logged_user.id)

        data = [{
            "id"          : u.id,
            "username"    : u.username,
            "role"        : u.role,
            "credit"      : u.credit,
            "status"      : u.status,
            "parent"      : u.parent.username if u.parent else None,
            "vc_username" : u.vc_username or "",
            "vc_password" : u.vc_password or "",
            "vc_caller_id": u.vc_caller_id or "",
            "vc_plan_id"  : u.vc_plan_id,
            "vc_call_type": u.vc_call_type,
            "created_at"  : u.created_at.isoformat(),
        } for u in users]
        return Response(data)
    except Exception as e:
        print("LIST USERS ERROR:", e)
        return Response([])

# =====================================
# CREDIT HISTORY
# =====================================
@api_view(['GET'])
def credit_history(request):
    try:
        logged_user = User.objects.get(id=request.GET.get("user_id"))

        if logged_user.role == "admin":
            history = CreditHistory.objects.all().order_by("-id")
        elif logged_user.role == "reseller":
            users   = [logged_user] + list(logged_user.children.all())
            history = CreditHistory.objects.filter(user__in=users).order_by("-id")
        else:
            history = CreditHistory.objects.filter(user=logged_user).order_by("-id")

        data = [{
            "username"  : h.user.username,
            "credit"    : h.amount,
            "type"      : h.type,
            "remarks"   : h.remarks,
            "created_at": h.created_at.isoformat(),
        } for h in history]
        return Response(data)
    except Exception as e:
        print("CREDIT HISTORY ERROR:", e)
        return Response([])
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST


@csrf_exempt
@require_POST
def plan_trip(request):
    # Phase 2 - will be implemented
    return JsonResponse({"message": "trip planner api is running"})
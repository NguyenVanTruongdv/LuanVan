// BE/Controllers/ApiControllerBase.cs
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BE.Controllers
{
    // Chứa các helper lấy thông tin người dùng đang đăng nhập — dùng chung cho mọi controller
    // cần biết "ai đang thực hiện hành động" (nhân viên hay khách tự thao tác).
    public abstract class ApiControllerBase : ControllerBase
    {
        protected long GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null || !long.TryParse(claim.Value, out var userId))
                throw new UnauthorizedAccessException("Không xác định được người dùng đang đăng nhập. Vui lòng đăng nhập lại.");
            return userId;
        }

        // TODO: đổi "Staff" cho đúng tên role bạn đang dùng khi tạo token (User.IsInRole).
        protected bool IsEmployee() => User.IsInRole("Staff") || User.IsInRole("Manager") || User.IsInRole("Admin");

        // performedBy = id nhân viên nếu người gọi là nhân viên, null nếu là khách tự thao tác.
        protected long? GetPerformedByOrNull() => IsEmployee() ? GetCurrentUserId() : null;

        // Lấy chi nhánh của nhân viên đang đăng nhập từ claim "BranchId" nhúng lúc login.
        // TODO: đổi tên claim nếu bạn đặt tên khác lúc tạo token.
        protected int? GetCurrentUserBranchId()
        {
            var claim = User.FindFirst("BranchId");
            if (claim == null || !int.TryParse(claim.Value, out var branchId))
                return null;
            return branchId;
        }
    }
}
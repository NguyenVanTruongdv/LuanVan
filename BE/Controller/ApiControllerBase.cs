// BE/Controllers/ApiControllerBase.cs
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using BE.Helpers;

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

        protected bool IsEmployee() =>
            User.IsInRole("Staff") || User.IsInRole("Manager") || User.IsInRole("Admin");

        // performedBy = id nhân viên nếu người gọi là nhân viên, null nếu là khách tự thao tác.
        protected long? GetPerformedByOrNull() => IsEmployee() ? GetCurrentUserId() : null;

        // Lấy 1 chi nhánh (chi nhánh đầu tiên) của nhân viên — giữ để tương thích code cũ.
        // Nếu nhân viên thuộc nhiều chi nhánh, nên dùng GetCurrentUserBranchIds() thay vì hàm này.
        protected int? GetCurrentUserBranchId()
        {
            var claim = User.FindFirst(JwtHelper.ClaimBranchId);
            if (claim == null || !int.TryParse(claim.Value, out var branchId))
                return null;
            return branchId;
        }

        // MỚI: lấy đầy đủ danh sách chi nhánh nhân viên đang làm việc.
        protected List<int> GetCurrentUserBranchIds()
        {
            return User.FindAll(JwtHelper.ClaimBranchId)
                .Select(c => int.TryParse(c.Value, out var id) ? id : (int?)null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .ToList();
        }
    }
}
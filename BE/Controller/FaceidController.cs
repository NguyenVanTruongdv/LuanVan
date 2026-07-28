using BE.Dtos.Member;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/faceid")]
    public class FaceIdController : ControllerBase
    {
        private readonly FaceIdService _faceIdService;

        public FaceIdController(FaceIdService faceIdService)
        {
            _faceIdService = faceIdService;
        }

        /// <summary>
        /// [HỘI VIÊN] Kiểm tra ảnh khuôn mặt trước khi tạo hội viên mới, kích hoạt,
        /// hoặc đổi FaceID hội viên. KHÔNG lưu gì vào DB.
        /// </summary>
        [HttpPost("member/check")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<FaceCheckResultDto>> CheckMemberFace([FromForm] CheckMemberFaceRequest request)
        {
            if (request.ProfileImage == null || request.ProfileImage.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn ảnh cần kiểm tra." });

            var result = await _faceIdService.CheckMemberFaceAsync(request.ProfileImage, request.ExcludeMemberId);
            return Ok(result);
        }

        /// <summary>
        /// [NHÂN VIÊN] Kiểm tra ảnh khuôn mặt trước khi tạo/đổi FaceID cho nhân viên.
        /// KHÔNG lưu gì vào DB.
        /// </summary>
        [HttpPost("employee/check")]
        [Authorize(Roles = "Admin,Manager")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<FaceCheckResultDto>> CheckEmployeeFace([FromForm] CheckEmployeeFaceRequest request)
        {
            if (request.ProfileImage == null || request.ProfileImage.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn ảnh cần kiểm tra." });

            var result = await _faceIdService.CheckEmployeeFaceAsync(request.ProfileImage, request.ExcludeEmployeeId);
            return Ok(result);
        }
    }
}
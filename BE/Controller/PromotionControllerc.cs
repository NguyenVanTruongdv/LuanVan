using BE.Dtos.Promotion;
using BE.Models;
using BE.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PromotionsController : ControllerBase
{
    private readonly PromotionService _promotionService;

    public PromotionsController(PromotionService promotionService)
    {
        _promotionService = promotionService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<PromotionListItem>>> GetPromotions(
        [FromQuery] string? keyword,
        [FromQuery] int? planId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _promotionService.GetPromotionsAsync(keyword, planId, page, pageSize);
        return Ok(result);
    }

    // ===================== GET: api/promotions/{id} =====================
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PromotionListItem>> GetPromotionById(int id)
    {
        try
        {
            var promo = await _promotionService.GetPromotionByIdAsync(id);
            return Ok(promo);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

  
    [HttpGet("applicable/{planId:int}")]
    public async Task<ActionResult<List<ApplicablePromotionItem>>> GetApplicablePromotions(int planId)
    {
        var result = await _promotionService.GetApplicablePromotionsAsync(planId);
        return Ok(result);
    }

    // ===================== POST: api/promotions =====================
    [HttpPost]
    public async Task<ActionResult<PromotionListItem>> CreatePromotion([FromBody] CreatePromotionRequest request)
    {
        var promotion = new Promotion
        {
            TenKhuyenMai = request.TenKhuyenMai,
            PlanId = request.PlanId,
            PromoType = request.PromoType,
            PhanTramGiam = request.PhanTramGiam,
            SoTienGiam = request.SoTienGiam,
            MucGiamToiDa = request.MucGiamToiDa,
            SoNgayTang = request.SoNgayTang,
            SoChuKyTang = request.SoChuKyTang,
            NgayBatDau = request.NgayBatDau,
            NgayKetThuc = request.NgayKetThuc,
            GioiHanLuot = request.GioiHanLuot,
            MoTa = request.MoTa,
            TrangThai = request.TrangThai,
            NguoiTao = request.NguoiTao
        };

        try
        {
            var created = await _promotionService.CreatePromotionAsync(promotion);
            var item = await _promotionService.GetPromotionByIdAsync(created.PromotionId);
            return CreatedAtAction(nameof(GetPromotionById), new { id = created.PromotionId }, item);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ===================== PUT: api/promotions/{id} =====================
    [HttpPut("{id:int}")]
    public async Task<ActionResult<PromotionListItem>> UpdatePromotion(int id, [FromBody] UpdatePromotionRequest request)
    {
        var updated = new Promotion
        {
            TenKhuyenMai = request.TenKhuyenMai,
            PlanId = request.PlanId,
            PromoType = request.PromoType,
            PhanTramGiam = request.PhanTramGiam,
            SoTienGiam = request.SoTienGiam,
            MucGiamToiDa = request.MucGiamToiDa,
            SoNgayTang = request.SoNgayTang,
            SoChuKyTang = request.SoChuKyTang,
            NgayBatDau = request.NgayBatDau,
            NgayKetThuc = request.NgayKetThuc,
            GioiHanLuot = request.GioiHanLuot,
            MoTa = request.MoTa,
            TrangThai = request.TrangThai
        };

        try
        {
            var result = await _promotionService.UpdatePromotionAsync(id, updated);
            var item = await _promotionService.GetPromotionByIdAsync(result.PromotionId);
            return Ok(item);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

   
    [HttpPatch("{id:int}/visibility")]
    public async Task<ActionResult<PromotionListItem>> SetVisibility(int id, [FromBody] SetPromotionVisibilityRequest request)
    {
        try
        {
            await _promotionService.SetPromotionVisibilityAsync(id, request.An);
            var item = await _promotionService.GetPromotionByIdAsync(id);
            return Ok(item);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePromotion(int id)
    {
        try
        {
            await _promotionService.DeletePromotionAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    // GET api/promotions/usage-history?promotionId=&memberId=&planId=&fromDate=&toDate=&page=&pageSize=
    [HttpGet("usage-history")]
    public async Task<IActionResult> GetPromotionUsageHistory([FromQuery] PromotionUsageHistoryQueryDto query)
    {
        var result = await _promotionService.GetPromotionUsageHistoryAsync(query);
        return Ok(result);
    }
}
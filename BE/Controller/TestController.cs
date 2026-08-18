// using System;
// using System.Linq;
// using System.Security.Claims;
// using System.Threading.Tasks;
// using BE.Data;
// using BE.Models;
// using BE.Services;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;

// namespace BE.Controllers
// {
//     [ApiController]
//     [Route("api/test")]
//     public class TestController : ControllerBase
//     {
//         private readonly GymManagementContext _context;
//         public TestController(GymManagementContext context)
//         {
//             _context = context;
//         }
//         [HttpGet]
//         public async Task<IActionResult> GoiTapBanNhieuNhat()
//         {

//             var result = await _context.MemberPackages.GroupBy(x => x.Plan)
//                                         .Select(g => new
//                                         {
//                                             PlanId = g.Key,
//                                             soluongban = g.Count()
//                                         }).OrderByDescending(x => x.soluongban).FirstOrDefaultAsync();
//             return Ok();
//         }
//         [HttpGet("nguoi-check-in-nhieu-nhat")]
//         public async Task<IActionResult> NguoiCheckinNhieuNhat()
//         {
//             var result = await _context.CheckIns.GroupBy(x => x.Member)
//                                         .Select(g => new
//                                         {
//                                             MemberId = g.Key,
//                                             soluotcheckin = g.Count()
//                                         }).OrderByDescending(x => x.soluotcheckin).FirstOrDefaultAsync();
//             return Ok(result);
//         }
//         [HttpGet("5-goi-tap-ban-nhieu-nhat")]
//         public async Task<IActionResult> goiban()
//         {
//             var result = await _context.MemberPackages.GroupBy(x => x.Plan)
//                                         .Select(g => new
//                                         {
//                                             PlanId = g.Key,
//                                             soluongban = g.Count()
//                                         }).OrderByDescending(x => x.soluongban).Take(5).ToListAsync();
//             return Ok(result);
//         }
//         [HttpGet]
//         public async Task<IActionResult> goiTapBanNhieuNhatIn8()
//         {
//             var result = await _context.MemberPackages.Where(x=>x.StartDate.Value.Month==8 && x.StartDate.Value.Year==2026).GroupBy(x => x.Plan)
//                                                         .Select(g => new
//                                                         {
//                                                             PlanId = g.Key,
//                                                             soluongban = g.Count()
//                                                         }).FirstOrDefaultAsync();
//             return Ok(result);
//         }

//     }
// }
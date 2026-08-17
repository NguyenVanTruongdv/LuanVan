using BE.Data;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ForumCommentService
{
    private readonly GymManagementContext _context;
    private readonly ForumNotificationService _notificationService;

    // Giới hạn depth (độ sâu) trả lời để tránh cây quá dài trên UI mobile
    private const int MAX_DEPTH = 5;

    public ForumCommentService(GymManagementContext context, ForumNotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

 
    public async Task<List<ForumCommentDto>> GetByPostIdAsync(long postId, long? currentMemberId)
    {
        // B1: lấy hết comment active của post này ra, sort theo ngày tạo
        List<ForumComment> dsComment = await _context.ForumComments
            .Include(c => c.Member).ThenInclude(m => m.FaceDatum)
            .Include(c => c.ReplyToMember)
            .Where(c => c.PostId == postId && c.Status == "Active")
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        // B2: lấy danh sách comment mà currentMember đã like (để show trái tim đỏ/xanh)
        List<long> listIdCmtDaLike = new List<long>();
        if (currentMemberId.HasValue)
        {
            List<long> dsCommentId = new List<long>();
            foreach (var cmt in dsComment)
            {
                dsCommentId.Add(cmt.CommentId);
            }

            listIdCmtDaLike = await _context.ForumCommentLikes
                .Where(l => dsCommentId.Contains(l.CommentId) && l.MemberId == currentMemberId.Value)
                .Select(l => l.CommentId)
                .ToListAsync();
        }

        // B3: map từng comment -> dto, đồng thời bỏ vào dictionary để lát nối cha - con
        Dictionary<long, ForumCommentDto> dicDtoTheoId = new Dictionary<long, ForumCommentDto>();
        foreach (var cmt in dsComment)
        {
            ForumCommentDto dto = MapToDto(cmt, listIdCmtDaLike);
            dicDtoTheoId[cmt.CommentId] = dto;
        }

        // B4: duyệt lại 1 lần nữa, comment nào không có cha -> root, có cha -> nhét vào Replies của cha
        List<ForumCommentDto> dsRoot = new List<ForumCommentDto>();
        foreach (var cmt in dsComment)
        {
            ForumCommentDto dtoHienTai = dicDtoTheoId[cmt.CommentId];

            if (cmt.ParentCommentId == null)
            {
                dsRoot.Add(dtoHienTai);
            }
            else
            {
                if (dicDtoTheoId.ContainsKey(cmt.ParentCommentId.Value))
                {
                    ForumCommentDto dtoCha = dicDtoTheoId[cmt.ParentCommentId.Value];
                    dtoCha.Replies.Add(dtoHienTai);
                }
                // nếu không tìm thấy cha (cha đã bị xóa/ẩn) thì coi như mồ côi -> bỏ qua, không hiện
            }
        }

        return dsRoot;
    }


    public async Task<(bool Success, string? Error, ForumCommentDto? Data)> CreateAsync(
        long memberId, ForumCommentCreateDto dto)
    {
        var baiViet = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == dto.PostId);
        if (baiViet == null || baiViet.Status != "Active")
        {
            return (false, "Bài viết không tồn tại hoặc đã bị ẩn/xóa", null);
        }

        long? replyToMemberId = null;

        // Nếu là trả lời 1 comment khác (không phải comment gốc)
        if (dto.ParentCommentId.HasValue)
        {
            var cmtCha = await _context.ForumComments
                .FirstOrDefaultAsync(c => c.CommentId == dto.ParentCommentId.Value);

            if (cmtCha == null || cmtCha.PostId != dto.PostId || cmtCha.Status != "Active")
            {
                return (false, "Bình luận không tồn tại", null);
            }

            int depth = await GetDepthAsync(cmtCha.CommentId);
            if (depth >= MAX_DEPTH)
            {
                return (false, $"Chỉ hỗ trợ trả lời tối đa {MAX_DEPTH} cấp", null);
            }

        
            replyToMemberId = cmtCha.MemberId;
        }

        var cmtMoi = new ForumComment
        {
            PostId = dto.PostId,
            MemberId = memberId,
            ParentCommentId = dto.ParentCommentId, // trỏ thẳng cha trực tiếp, 
            ReplyToMemberId = replyToMemberId,
            Content = dto.Content,
            Status = "Active",
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        _context.ForumComments.Add(cmtMoi);
        baiViet.CommentCount = baiViet.CommentCount + 1; // đếm cả reply

        // Lưu trước để có CommentId thật (cần cho notification.comment_id)
        await _context.SaveChangesAsync();

        // ===== Tạo thông báo: phân biệt rõ "bình luận bài viết" và "trả lời bình luận" =====
        if (replyToMemberId.HasValue)
        {
            // Trả lời -> báo cho CHỦ BÌNH LUẬN CHA
            await _notificationService.CreateAsync(
                recipientMemberId: replyToMemberId.Value,
                actorMemberId: memberId,
                notifyType: ForumNotifyType.Reply,
                postId: dto.PostId,
                commentId: cmtMoi.CommentId);
        }
        else
        {
            // Bình luận gốc -> báo cho CHỦ BÀI VIẾT
            await _notificationService.CreateAsync(
                recipientMemberId: baiViet.MemberId,
                actorMemberId: memberId,
                notifyType: ForumNotifyType.Comment,
                postId: dto.PostId,
                commentId: cmtMoi.CommentId);
        }

        ForumCommentDto ketQua = MapToDto(cmtMoi, new List<long>());
        return (true, null, ketQua);
    }

    // ===== TYM / BỎ TYM BÌNH LUẬN =====
    public async Task<(bool Success, string? Error, bool IsLiked, int LikeCount)> ToggleLikeAsync(
        long commentId, long memberId)
    {
        var cmt = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == commentId);
        if (cmt == null || cmt.Status != "Active")
        {
            return (false, "Bình luận không tồn tại", false, 0);
        }

        var likeCu = await _context.ForumCommentLikes
            .FirstOrDefaultAsync(l => l.CommentId == commentId && l.MemberId == memberId);

        bool dangLike;

        if (likeCu != null)
        {
            // đã like rồi -> bấm nữa là bỏ like
            _context.ForumCommentLikes.Remove(likeCu);
            cmt.LikeCount = Math.Max(0, cmt.LikeCount - 1);
            dangLike = false;
        }
        else
        {
            // chưa like -> thêm mới
            var likeMoi = new ForumCommentLike
            {
                CommentId = commentId,
                MemberId = memberId,
                CreatedAt = DateTime.Now
            };
            _context.ForumCommentLikes.Add(likeMoi);
            cmt.LikeCount = cmt.LikeCount + 1;
            dangLike = true;
        }

        await _context.SaveChangesAsync();

        return (true, null, dangLike, cmt.LikeCount);
    }

    // ===== XÓA BÌNH LUẬN (soft delete) — khách tự xóa của mình, hoặc admin xóa bất kỳ =====
    public async Task<(bool Success, string? Error)> DeleteAsync(long commentId, long requesterId, bool isAdmin = false)
    {
        var cmt = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == commentId);
        if (cmt == null)
        {
            return (false, "Không tìm thấy bình luận");
        }

        if (cmt.Status == "Deleted")
        {
            return (false, "Bình luận đã được xóa trước đó");
        }

        // Khách chỉ xóa được bình luận của chính mình; admin thì bỏ qua check quyền sở hữu
        if (isAdmin == false && cmt.MemberId != requesterId)
        {
            return (false, "Bạn không có quyền xóa bình luận này");
        }

        // Xóa cả nhánh con (n cấp) bên dưới nó, vì reply không còn nghĩa khi cha đã bị xóa
        List<long> dsIdConChau = await GetAllDescendantIdsAsync(commentId);

        cmt.Status = "Deleted";
        cmt.UpdatedAt = DateTime.Now;

        if (dsIdConChau.Count > 0)
        {
            await _context.ForumComments
                .Where(c => dsIdConChau.Contains(c.CommentId) && c.Status == "Active")
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.Status, "Deleted")
                    .SetProperty(c => c.UpdatedAt, DateTime.Now));
        }

        var baiViet = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == cmt.PostId);
        if (baiViet != null)
        {
            baiViet.CommentCount = Math.Max(0, baiViet.CommentCount - 1 - dsIdConChau.Count);
        }

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // ===== Helper: đếm depth (độ sâu) hiện tại bằng cách leo ngược lên cha =====
    private async Task<int> GetDepthAsync(long commentId)
    {
        int depth = 0;
        long? idDangXet = commentId;

        while (idDangXet.HasValue && depth < MAX_DEPTH + 1)
        {
            long? idCha = await _context.ForumComments
                .Where(c => c.CommentId == idDangXet.Value)
                .Select(c => c.ParentCommentId)
                .FirstOrDefaultAsync();

            depth = depth + 1;
            idDangXet = idCha;
        }

        return depth;
    }

    // ===== Helper: BFS toàn bộ hậu duệ (con, cháu, chắt...) của 1 comment =====
    private async Task<List<long>> GetAllDescendantIdsAsync(long rootCommentId)
    {
        long postId = await _context.ForumComments
            .Where(c => c.CommentId == rootCommentId)
            .Select(c => c.PostId)
            .FirstOrDefaultAsync();

        var dsCommentTrongPost = await _context.ForumComments
            .Where(c => c.PostId == postId && c.Status == "Active")
            .Select(c => new { c.CommentId, c.ParentCommentId })
            .ToListAsync();

        // gom con theo từng cha: key = id cha, value = danh sách id con
        Dictionary<long, List<long>> dicConTheoCha = new Dictionary<long, List<long>>();
        foreach (var cmt in dsCommentTrongPost)
        {
            if (cmt.ParentCommentId.HasValue)
            {
                long idCha = cmt.ParentCommentId.Value;
                if (dicConTheoCha.ContainsKey(idCha) == false)
                {
                    dicConTheoCha[idCha] = new List<long>();
                }
                dicConTheoCha[idCha].Add(cmt.CommentId);
            }
        }

        List<long> ketQua = new List<long>();
        Queue<long> hangDoi = new Queue<long>();
        hangDoi.Enqueue(rootCommentId);

        while (hangDoi.Count > 0)
        {
            long idHienTai = hangDoi.Dequeue();

            if (dicConTheoCha.ContainsKey(idHienTai))
            {
                List<long> dsCon = dicConTheoCha[idHienTai];
                foreach (var idCon in dsCon)
                {
                    ketQua.Add(idCon);
                    hangDoi.Enqueue(idCon);
                }
            }
        }

        return ketQua;
    }

    // ===== MAPPER: đổi Entity -> Dto để trả về cho FE =====
    private static ForumCommentDto MapToDto(ForumComment c, List<long> likedIds)
    {
        ForumCommentDto dto = new ForumCommentDto
        {
            CommentId = c.CommentId,
            PostId = c.PostId,
            MemberId = c.MemberId,
            MemberName = c.Member != null ? c.Member.FullName : "",
            MemberAvatar = c.Member != null && c.Member.FaceDatum != null ? c.Member.FaceDatum.ProfileImage : null,
            ParentCommentId = c.ParentCommentId,
            ReplyToMemberId = c.ReplyToMemberId,
            ReplyToMemberName = c.ReplyToMember != null ? c.ReplyToMember.FullName : null,
            Content = c.Content,
            LikeCount = c.LikeCount,
            IsLikedByCurrentUser = likedIds.Contains(c.CommentId),
            CreatedAt = c.CreatedAt,
        };

        return dto;
    }
}
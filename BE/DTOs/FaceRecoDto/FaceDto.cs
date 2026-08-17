namespace BE.DTOs; 
   public class FaceSearchResult
    {
        public FaceSearchStatus Status { get; set; }
        public FaceOwnerType? OwnerType { get; set; }
        public long? MemberId { get; set; }
        public long? EmployeeId { get; set; }
        public float Similarity { get; set; }

       
        public string? MatchedFaceId { get; set; }
    }
    public enum FaceOwnerType
    {
        Member,
        Employee
    }

    public enum FaceSearchStatus
    {
        NoFace,         // Ảnh không có khuôn mặt rõ (AWS ném InvalidParameterException)
        NotRecognized,  // Có mặt nhưng không khớp ai trong collection
        Found           // Khớp được 1 người (hội viên hoặc nhân viên)
    }
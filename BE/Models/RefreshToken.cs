using System;
using System.Collections.Generic;

namespace BE.Models;

public partial class RefreshToken
{
    public long TokenId { get; set; }

    public long EntityId { get; set; }

    public string EntityType { get; set; } = null!;

    public string Role { get; set; } = null!;

    public string TokenHash { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}

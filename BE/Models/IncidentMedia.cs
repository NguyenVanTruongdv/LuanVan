using System;
using System.Collections.Generic;

namespace BE.Models;

public partial class IncidentMedia
{
    public int MediaId { get; set; }

    public int IncidentId { get; set; }

    public string MediaType { get; set; } = null!;

    public string MediaUrl { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual Incident Incident { get; set; } = null!;
}

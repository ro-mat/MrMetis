using System;

namespace MrMetis.Core.Entities.Base;

public class BaseEntity
{
    public int Id { get; set; }
    public bool IsActive { get; set; }
    public DateTime Created { get; set; }
    public DateTime? Modified { get; set; }
}
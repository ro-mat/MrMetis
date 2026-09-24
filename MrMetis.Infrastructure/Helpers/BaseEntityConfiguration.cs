using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using MrMetis.Core.Entities.Base;

namespace MrMetis.Infrastructure.Helpers;

public static class BaseEntityConfiguration
{
    /// <summary>
    /// Hides soft deleted (inactive) rows of every <see cref="BaseEntity"/> from queries
    /// </summary>
    public static ModelBuilder ApplySoftDeleteQueryFilter(this ModelBuilder modelBuilder)
    {
        var entityTypes = modelBuilder.Model.GetEntityTypes()
            .Where(t => t.BaseType is null && typeof(BaseEntity).IsAssignableFrom(t.ClrType));

        foreach (var entityType in entityTypes)
        {
            var entity = Expression.Parameter(entityType.ClrType, "entity");
            var filter = Expression.Lambda(Expression.Property(entity, nameof(BaseEntity.IsActive)), entity);
            modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
        }

        return modelBuilder;
    }
}

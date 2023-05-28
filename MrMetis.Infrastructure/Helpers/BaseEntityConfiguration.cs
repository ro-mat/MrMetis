
using System;
using System.Linq;
using System.Reflection;
using MrMetis.Core.Entities.Base;
using Microsoft.EntityFrameworkCore;

namespace MrMetis.Infrastructure.Helpers;

public static class BaseEntityConfiguration
{
    public static void Configure<TEntity>(ModelBuilder modelBuilder) where TEntity : BaseEntity
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(entity => EF.Property<bool>(entity, nameof(entity.IsActive)) != false);
    }

    public static ModelBuilder ApplyBaseEntityConfiguration(this ModelBuilder modelBuilder)
    {
        if (modelBuilder is null)
        {
            throw new ArgumentNullException(nameof(modelBuilder));
        }

        var method = typeof(BaseEntityConfiguration).GetTypeInfo().DeclaredMethods
            .Single(m => m.Name == nameof(Configure));
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (entityType.ClrType.HasBaseEntity(typeof(BaseEntity)))
            {

                method.MakeGenericMethod(entityType.ClrType).Invoke(null, new[] { modelBuilder });
            }
        }
        return modelBuilder;
    }

    static bool HasBaseEntity(this Type type, Type T)
    {
        for (var baseType = type.BaseType; baseType != null; baseType = baseType.BaseType)
        {
            if (baseType == T)
            {
                return true;
            }
        }

        return false;
    }
}
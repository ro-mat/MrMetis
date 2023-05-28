using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using MrMetis.Infrastructure.Contexts;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using MrMetis.Core.Interfaces.Base;
using MrMetis.Core.Entities.Base;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Specifications;
using System.Linq;
using MrMetis.Core.Exceptions;

namespace MrMetis.Infrastructure.Repositories
{
    public class MrMetisRepository<T> : IAsyncRepository<T> where T : BaseEntity, IAggregateRoot
    {
        protected readonly MrMetisContext _dbContext;

        public MrMetisRepository(MrMetisContext dbContext)
        {
            _dbContext = dbContext;
        }

        public virtual async Task<T> GetByIdAsync(int id)
        {
            return await _dbContext.Set<T>().FindAsync(id);
        }

        public async Task<IReadOnlyList<T>> ListAllAsync()
        {
            return await _dbContext.Set<T>()
                .ToListAsync();
        }

        public async Task<int> CountAllAsync()
        {
            return await _dbContext.Set<T>()
                .CountAsync();
        }

        public async Task<IReadOnlyList<T>> ListAsNoTrackingAsync(Expression<Func<T, bool>> func, params Expression<Func<T, object>>[] includes)
        {
            return await ListAsNoTrackingAsync(new BaseSpecification<T>(func, includes));
        }

        public async Task<IReadOnlyList<T>> ListAsNoTrackingAsync(ISpecification<T> spec, params Expression<Func<T, object>>[] includes)
        {
            return await ApplySpecification(spec)
                .AsNoTracking().ToListAsync();
        }

        public async Task<IReadOnlyList<T>> ListAsync(Expression<Func<T, bool>> func, params Expression<Func<T, object>>[] includes)
        {
            return await ListAsync(new BaseSpecification<T>(func, includes));
        }

        public async Task<IReadOnlyList<T>> ListAsync(ISpecification<T> spec)
        {
            return await ApplySpecification(spec)
                .ToListAsync();
        }

        public async Task<T> GetAsync(Expression<Func<T, bool>> func, bool throwIfNull = false)
        {
            return await GetAsync(new BaseSpecification<T>(func), throwIfNull);
        }

        public async Task<T> GetAsync(Expression<Func<T, bool>> func, params Expression<Func<T, object>>[] includes)
        {
            return await GetAsync(new BaseSpecification<T>(func, includes), false);
        }
        public async Task<T> GetAsync(ISpecification<T> spec, bool throwIfNull = false)
        {
            var t = await ApplySpecification(spec).FirstOrDefaultAsync();
            if (t is null && throwIfNull)
            {
                throw new MrMetisException($"{typeof(T).ToString().Split('.').LastOrDefault()} not found!");
            }

            return t;
        }

        public async Task<int> CountAsync(Expression<Func<T, bool>> func)
        {
            return await CountAsync(new BaseSpecification<T>(func));
        }

        public async Task<int> CountAsync(ISpecification<T> spec)
        {
            return await ApplySpecification(spec)
                .CountAsync();
        }

        public async Task<IReadOnlyList<T>> ListAllWithDeletedAsync()
        {
            return await _dbContext.Set<T>().IgnoreQueryFilters().ToListAsync();
        }

        public async Task<int> CountAllWithDeletedAsync()
        {
            return await _dbContext.Set<T>().IgnoreQueryFilters().CountAsync();
        }

        public async Task<IReadOnlyList<T>> ListWithDeletedAsync(ISpecification<T> spec)
        {
            if (spec is null)
            {
                throw new ArgumentNullException(nameof(spec));
            }

            return await ApplySpecification(spec).IgnoreQueryFilters().ToListAsync();
        }

        public async Task<int> CountWithDeletedAsync(ISpecification<T> spec)
        {
            if (spec is null)
            {
                throw new ArgumentNullException(nameof(spec));
            }

            return await ApplySpecification(spec).IgnoreQueryFilters().CountAsync();
        }

        public virtual async Task<T> AddAsync(T entity)
        {
            await _dbContext.Set<T>().AddAsync(entity);
            SetAuditableValues();
            await _dbContext.SaveChangesAsync();

            return entity;
        }

        public async Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entity)
        {
            await _dbContext.Set<T>().AddRangeAsync(entity);
            SetAuditableValues();
            await _dbContext.SaveChangesAsync();

            return entity;
        }

        public virtual async Task UpdateAsync(T entity)
        {
            _dbContext.Entry(entity).State = EntityState.Modified;
            SetAuditableValues();
            await _dbContext.SaveChangesAsync();
        }

        public virtual async Task UpdateAsync(IEnumerable<T> entities)
        {
            foreach (var entity in entities)
            {
                _dbContext.Entry(entity).State = EntityState.Modified;
            }
            SetAuditableValues();
            await _dbContext.SaveChangesAsync();
        }

        public virtual async Task DeleteAsync(T entity)
        {
            // The entity will be changed to inactive (while still being kept in the database)
            if (entity is null)
            {
                throw new ArgumentNullException(nameof(entity));
            }

            if (entity is BaseEntity auditableEntity)
            {
                auditableEntity.IsActive = false;
            }
            else if (entity is BaseEntity mrMetisEntity)
            {
                mrMetisEntity.IsActive = false;
            }

            SoftDeleteDependentEntities(entity);
            SetAuditableValues();

            await _dbContext.SaveChangesAsync();
        }

        private void SoftDeleteDependentEntities(BaseEntity entity)
        {
            var navigationEntries = _dbContext.Entry(entity).Navigations.Where(n => !((INavigation)n.Metadata).IsOnDependent);

            foreach (var navigationEntry in navigationEntries)
            {
                if (navigationEntry is CollectionEntry collectionEntry)
                {
                    Reload(collectionEntry);

                    foreach (var dependentEntry in collectionEntry.CurrentValue)
                    {
                        _dbContext.Entry(dependentEntry).State = EntityState.Deleted;

                        SoftDeleteDependentEntities((BaseEntity)dependentEntry);
                    }
                }
                else
                {
                    Reload(navigationEntry);

                    var dependentEntry = navigationEntry.CurrentValue;
                    if (dependentEntry != null)
                    {
                        _dbContext.Entry(dependentEntry).State = EntityState.Deleted;

                        SoftDeleteDependentEntities((BaseEntity)dependentEntry);
                    }
                }
            }
        }

        private void Reload(NavigationEntry navigationEntry)
        {
            if (navigationEntry.IsLoaded)
            {
                return;
            }

            navigationEntry.IsLoaded = false;
            navigationEntry.Load();
        }

        public async Task<bool> RemoveAsync(T entity)
        {
            // Will delete item from database
            if (entity is null)
            {
                throw new ArgumentNullException(nameof(entity));
            }

            _dbContext.Remove<T>(entity);
            int changes = await _dbContext.SaveChangesAsync();

            if (changes >= 0)
            {
                return true;
            }
            return false;
        }

        public async Task<bool> RemoveRangeAsync(IReadOnlyList<T> entity)
        {
            // Will delete item from database
            if (entity is null)
            {
                throw new ArgumentNullException(nameof(entity));
            }

            _dbContext.RemoveRange(entity);
            int changes = await _dbContext.SaveChangesAsync();

            if (changes >= 0)
            {
                return true;
            }
            return false;
        }

        private IQueryable<T> ApplySpecification(ISpecification<T> spec)
        {
            return new SpecificationEvaluator<T>().GetQuery(_dbContext.Set<T>().AsQueryable(), spec);
        }

        private void SetAuditableValues()
        {
            var updatedDate = DateTime.UtcNow;

            var addedAuditable = _dbContext.ChangeTracker.Entries().Where(x => x.State == EntityState.Added && x.Entity is BaseEntity);
            var modifiedAuditable = _dbContext.ChangeTracker.Entries().Where(x => x.State == EntityState.Modified && x.Entity is BaseEntity);
            var deleted = _dbContext.ChangeTracker.Entries().Where(x => x.State == EntityState.Deleted && x.Entity is BaseEntity);

            foreach (var entry in addedAuditable)
            {
                var ent = (BaseEntity)entry.Entity;
                ent.IsActive = true;
                ent.Created = updatedDate;
                ent.Modified = updatedDate;
            }

            foreach (var entry in modifiedAuditable)
            {
                var ent = (BaseEntity)entry.Entity;
                ent.Modified = updatedDate;
            }

            foreach (var entry in deleted)
            {
                entry.State = EntityState.Modified;

                if (entry.Entity is BaseEntity mrMetisEntity)
                {
                    mrMetisEntity.IsActive = false;
                }

                if (entry.Entity is BaseEntity auditableEntity)
                {
                    auditableEntity.IsActive = false;
                    auditableEntity.Modified = updatedDate;
                }
            }
        }

    }
}
using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace MrMetis.Core.Interfaces.Base
{
    public interface IAsyncRepository<T> where T : IAggregateRoot
    {
        Task<T> GetByIdAsync(int id);
        Task<IReadOnlyList<T>> ListAllAsync();
        Task<int> CountAllAsync();
        Task<IReadOnlyList<T>> ListAsNoTrackingAsync(Expression<Func<T, bool>> func, params Expression<Func<T, object>>[] includes);
        Task<IReadOnlyList<T>> ListAsNoTrackingAsync(ISpecification<T> spec, params Expression<Func<T, object>>[] includes);
        Task<IReadOnlyList<T>> ListAsync(Expression<Func<T, bool>> func, params Expression<Func<T, object>>[] includes);
        Task<IReadOnlyList<T>> ListAsync(ISpecification<T> spec);
        // Task<ListDto<T>> ListWithPagingAsync(ISpecification<T> spec, int itemsPerPage, int actualPage, Expression<Func<T, object>> orderBy = null, bool isDesc = false);
        // Task<ListDto<T>> ListWithPagingAsync(ISpecification<T> spec, int itemsPerPage, int actualPage, IEnumerable<OrderByTyped<T>> orderList);
        Task<IReadOnlyList<T>> ListWithDeletedAsync(ISpecification<T> spec);
        Task<T> GetAsync(Expression<Func<T, bool>> func, bool throwIfNull = false);
        Task<T> GetAsync(Expression<Func<T, bool>> func, params Expression<Func<T, object>>[] includes);
        Task<T> GetAsync(ISpecification<T> spec, bool throwIfNull = false);
        Task<int> CountAsync(Expression<Func<T, bool>> func);
        Task<int> CountAsync(ISpecification<T> spec);
        Task<T> AddAsync(T entity);
        Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entity);
        Task UpdateAsync(T entity);
        Task UpdateAsync(IEnumerable<T> entities);
        Task DeleteAsync(T entity);
        Task<bool> RemoveAsync(T entity);
        Task<bool> RemoveRangeAsync(IReadOnlyList<T> entity);
    }
}
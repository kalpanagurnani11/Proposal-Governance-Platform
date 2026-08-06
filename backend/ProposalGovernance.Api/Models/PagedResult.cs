using System;
using System.Collections.Generic;

namespace ProposalGovernance.Api.Models
{
    public class PagedResult<T>
    {
        public IEnumerable<T> Items { get; set; } = new List<T>();
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public int TotalCount { get; set; }
        public bool HasNext => CurrentPage < TotalPages;
        public bool HasPrevious => CurrentPage > 1;

        public PagedResult() { }

        public PagedResult(IEnumerable<T> items, int count, int page, int pageSize)
        {
            TotalCount = count;
            CurrentPage = page <= 0 ? 1 : page;
            PageSize = pageSize <= 0 ? 10 : pageSize;
            TotalPages = (int)Math.Ceiling(count / (double)PageSize);
            Items = items;
        }
    }
}

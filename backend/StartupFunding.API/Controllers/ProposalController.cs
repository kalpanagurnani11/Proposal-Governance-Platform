using Microsoft.AspNetCore.Mvc;
using StartupFunding.Application.DTOs.Proposal;
using StartupFunding.Application.Interfaces;

namespace StartupFunding.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProposalController : ControllerBase
{
    private readonly IProposalService _proposalService;

    public ProposalController(IProposalService proposalService)
    {
        _proposalService = proposalService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _proposalService.GetAllProposalsAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _proposalService.GetProposalByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProposalDto dto)
    {
        var result = await _proposalService.CreateProposalAsync(dto, 1); // Sandboxed founderId = 1
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getTeamsPolicyViaPowerShell(policyType, identity = 'Global') {
  // PowerShell script embedded as string
  const psScript = `
    param([string]$PolicyType, [string]$Identity)
    
    try {
      # Connect to Teams (must be pre-authenticated in Azure context)
      Import-Module MicrosoftTeams -ErrorAction Stop
      
      $result = switch($PolicyType) {
        'MeetingPolicy' { Get-CsTeamsMeetingPolicy -Identity $Identity }
        'ExternalAccess' { Get-CsTeamsExternalAccessPolicy -Identity $Identity }
        'GuestMeeting' { Get-CsTeamsGuestMeetingConfiguration }
        'ClientConfiguration' { Get-CsTeamsClientConfiguration }
        default { $null }
      }
      
      if ($result) {
        $result | ConvertTo-Json -Depth 10
      } else {
        @{ Error = "Policy not found" } | ConvertTo-Json
      }
    } catch {
      @{ Error = $_.Exception.Message } | ConvertTo-Json
    }
  `;

  // Call Azure CLI or direct PowerShell (requires AAD context)
  // This example uses Azure CLI with PowerShell script
  const cmd = `powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}" -PolicyType "${policyType}" -Identity "${identity}"`;
  
  try {
    const result = await Deno.run({
      cmd: ['powershell', '-NoProfile', '-Command', psScript],
      stdout: 'piped',
      stderr: 'piped',
    });

    const output = await result.output();
    const decoded = new TextDecoder().decode(output);
    return JSON.parse(decoded);
  } catch (err) {
    return { error: `PowerShell execution failed: ${err.message}` };
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { policyType, identity } = await req.json();
  
  if (!policyType) {
    return Response.json({ error: 'policyType required' }, { status: 400 });
  }

  const result = await getTeamsPolicyViaPowerShell(policyType, identity || 'Global');
  return Response.json(result);
});
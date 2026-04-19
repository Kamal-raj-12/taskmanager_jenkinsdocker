param(
    [string]$Region,
    [string]$InstanceType = "t3.small",
    [string]$SecurityGroupName = "Jenkins-CI-SG",
    [string]$KeyName = "jenkins-v2-key"
)

$ErrorActionPreference = "Stop"

if (-not $Region -or [string]::IsNullOrWhiteSpace($Region)) {
    $Region = (aws configure get region).Trim()
    if (-not $Region) {
        $Region = "us-east-1"
    }
}

$DownloadsPath = Join-Path $env:USERPROFILE "Downloads"
$PemPath = Join-Path $DownloadsPath "$KeyName.pem"

Write-Host "Using region: $Region"

# Resolve default VPC
$VpcId = (aws ec2 describe-vpcs --region $Region --filters Name=isDefault,Values=true --query "Vpcs[0].VpcId" --output text).Trim()
if (-not $VpcId -or $VpcId -eq "None") {
    throw "No default VPC found in region $Region. Create/select a VPC and update the script."
}

# Create or reuse Security Group
$SecurityGroupId = (aws ec2 describe-security-groups --region $Region --filters Name=group-name,Values=$SecurityGroupName Name=vpc-id,Values=$VpcId --query "SecurityGroups[0].GroupId" --output text).Trim()
if (-not $SecurityGroupId -or $SecurityGroupId -eq "None") {
    $SecurityGroupId = (aws ec2 create-security-group --region $Region --group-name $SecurityGroupName --description "Jenkins CI access: SSH(22) and Jenkins(8080)" --vpc-id $VpcId --query "GroupId" --output text).Trim()
}

# Ensure ingress rules exist
function Add-IngressRuleIfMissing {
    param(
        [string]$GroupId,
        [int]$Port
    )

    try {
        aws ec2 authorize-security-group-ingress --region $Region --group-id $GroupId --protocol tcp --port $Port --cidr 0.0.0.0/0 | Out-Null
    } catch {
        $message = $_.Exception.Message
        if ($message -match "InvalidPermission\.Duplicate") {
            Write-Host "Ingress rule already exists for TCP $Port on $GroupId"
            return
        }

        throw "Failed to authorize TCP $Port on security group $GroupId. AWS said: $message"
    }
}

Add-IngressRuleIfMissing -GroupId $SecurityGroupId -Port 22
Add-IngressRuleIfMissing -GroupId $SecurityGroupId -Port 8080

# Recreate key pair with exact requested name
$ExistingKey = (aws ec2 describe-key-pairs --region $Region --filters Name=key-name,Values=$KeyName --query "KeyPairs[0].KeyName" --output text).Trim()
if ($ExistingKey -eq $KeyName) {
    aws ec2 delete-key-pair --region $Region --key-name $KeyName | Out-Null
}
if (Test-Path $PemPath) {
    Remove-Item -Path $PemPath -Force
}

$KeyMaterialRaw = aws ec2 create-key-pair --region $Region --key-name $KeyName --query "KeyMaterial" --output text

function Format-PemKey {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RawKey
    )

    $trimmed = $RawKey.Trim()

    if ($trimmed -match "(?s)^-----BEGIN\s+([^\-]+?)\s+-----(.*?)-----END\s+\1\s+-----$") {
        $keyType = $matches[1].Trim()
        $body = ($matches[2] -replace "\s", "")
        $lines = @()

        for ($i = 0; $i -lt $body.Length; $i += 64) {
            $len = [Math]::Min(64, $body.Length - $i)
            $lines += $body.Substring($i, $len)
        }

        return "-----BEGIN $keyType-----`n$($lines -join "`n")`n-----END $keyType-----`n"
    }

    return ($trimmed -replace "`r?`n", "`n") + "`n"
}

$KeyMaterial = Format-PemKey -RawKey $KeyMaterialRaw
Set-Content -Path $PemPath -Value $KeyMaterial -Encoding ascii

# Restrict local PEM permissions
icacls $PemPath /inheritance:r /grant:r "$($env:USERNAME):(F)" | Out-Null

# Get latest Ubuntu LTS AMI (prefer 24.04, fallback to 22.04)
$AmiId = $null
try {
    $AmiId = (aws ssm get-parameter --region $Region --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id --query "Parameter.Value" --output text).Trim()
} catch {
    $AmiId = (aws ssm get-parameter --region $Region --name /aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp3/ami-id --query "Parameter.Value" --output text).Trim()
}

if (-not $AmiId -or $AmiId -eq "None") {
    throw "Unable to resolve Ubuntu LTS AMI from SSM in region $Region."
}

$InstanceId = (aws ec2 run-instances `
    --region $Region `
    --image-id $AmiId `
    --instance-type $InstanceType `
    --key-name $KeyName `
    --security-group-ids $SecurityGroupId `
    --count 1 `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=jenkins-ci-server}]" `
    --query "Instances[0].InstanceId" `
    --output text).Trim()

aws ec2 wait instance-running --region $Region --instance-ids $InstanceId

$PublicIp = (aws ec2 describe-instances --region $Region --instance-ids $InstanceId --query "Reservations[0].Instances[0].PublicIpAddress" --output text).Trim()

Write-Host "InstanceId: $InstanceId"
Write-Host "SecurityGroupId: $SecurityGroupId"
Write-Host "KeyPair PEM: $PemPath"
Write-Host "PublicIPv4: $PublicIp"

# Exact output requested for direct copy/use
Write-Output $PublicIp

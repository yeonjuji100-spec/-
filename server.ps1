$httpListener = New-Object System.Net.HttpListener
$httpListener.Prefixes.Add("http://localhost:8092/")
$httpListener.Start()
Write-Host "Server started at http://localhost:8092/"
try {
    while ($httpListener.IsListening) {
        $context = $httpListener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $localPath = $request.Url.LocalPath.TrimStart('/')
        if ($localPath -eq "") { $localPath = "index.html" }
        Write-Host "[$($request.HttpMethod)] $localPath -> $filePath"
        try {
            # API Endpoints
            if ($localPath -like "api/*") {
                $response.ContentType = "application/json"
                if ($localPath -eq "api/contact" -and $request.HttpMethod -eq "POST") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream)
                    $body = $reader.ReadToEnd()
                    $contactFile = Join-Path $PSScriptRoot "contacts.json"
                    $contacts = New-Object System.Collections.Generic.List[PSObject]
                    if (Test-Path $contactFile) { 
                        $data = Get-Content $contactFile | ConvertFrom-Json
                        if ($data -is [array]) { $data | ForEach-Object { $contacts.Add($_) } }
                        elseif ($data) { $contacts.Add($data) }
                    }
                    $newData = $body | ConvertFrom-Json
                    $newData | Add-Member -MemberType NoteProperty -Name "date" -Value (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                    $contacts.Add($newData)
                    $contacts | ConvertTo-Json -Depth 10 | Set-Content $contactFile
                    $resBody = @{ success = $true; message = "Contact saved" } | ConvertTo-Json
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($resBody)
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                elseif ($localPath -eq "api/board" -and $request.HttpMethod -eq "POST") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream)
                    $body = $reader.ReadToEnd()
                    $requestData = $body | ConvertFrom-Json
                    $boardFile = Join-Path $PSScriptRoot "board.json"
                    $posts = New-Object System.Collections.Generic.List[PSObject]
                    if (Test-Path $boardFile) { 
                        $rawJson = Get-Content $boardFile -Raw
                        if (-not [string]::IsNullOrWhiteSpace($rawJson)) {
                            $data = $rawJson | ConvertFrom-Json
                            if ($data -is [array]) { $data | ForEach-Object { $posts.Add($_) } }
                            elseif ($data) { $posts.Add($data) }
                        }
                    }

                    $action = if ($requestData.PSObject.Properties["action"]) { $requestData.action.ToString().ToLower() } else { "create" }
                    
                    if ($action -eq "delete") {
                        $postId = $requestData.id.ToString()
                        $found = $false
                        for ($i = 0; $i -lt $posts.Count; $i++) {
                            if ($posts[$i].id -eq $postId) {
                                $posts.RemoveAt($i)
                                $found = $true
                                break
                            }
                        }
                        if (-not $found) {
                            foreach ($p in $posts) {
                                if ($p.replies) {
                                    $newReplies = New-Object System.Collections.Generic.List[PSObject]
                                    $rFound = $false
                                    foreach ($r in $p.replies) {
                                        if ($r.id -eq $postId) { $rFound = $true }
                                        else { $newReplies.Add($r) }
                                    }
                                    if ($rFound) {
                                        $p.replies = $newReplies.ToArray()
                                        $found = $true
                                        break
                                    }
                                }
                            }
                        }
                    }
                    elseif ($action -eq "edit") {
                        $postId = $requestData.id.ToString()
                        $target = $posts | Where-Object { $_.id -eq $postId }
                        if ($target) {
                            $target.content = $requestData.content
                            $target.date = (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + " (?섏젙??"
                        } else {
                            foreach ($p in $posts) {
                                if ($p.replies) {
                                    $targetR = $p.replies | Where-Object { $_.id -eq $postId }
                                    if ($targetR) {
                                        $targetR.content = $requestData.content
                                        $targetR.date = (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + " (?섏젙??"
                                        break
                                    }
                                }
                            }
                        }
                    }
                    else {
                        # Create New Post/Reply
                        $newData = New-Object PSObject
                        $requestData.PSObject.Properties | ForEach-Object {
                            if ($_.Name -ne "action") {
                                $newData | Add-Member -NotePropertyName $_.Name -NotePropertyValue $_.Value
                            }
                        }
                        
                        if (-not $newData.PSObject.Properties["id"]) { $newData | Add-Member -NotePropertyName "id" -NotePropertyValue ([guid]::NewGuid().ToString()) }
                        if (-not $newData.PSObject.Properties["date"]) { $newData | Add-Member -NotePropertyName "date" -NotePropertyValue (Get-Date -Format "yyyy-MM-dd HH:mm:ss") }
                        if (-not $newData.PSObject.Properties["replies"]) { $newData | Add-Member -NotePropertyName "replies" -NotePropertyValue @() }
                        
                        if ($newData.PSObject.Properties["parentId"] -and $newData.parentId) {
                            $parent = $posts | Where-Object { $_.id -eq $newData.parentId }
                            if ($parent) {
                                $replies = New-Object System.Collections.Generic.List[PSObject]
                                if ($parent.replies -is [array]) { $parent.replies | ForEach-Object { $replies.Add($_) } }
                                elseif ($parent.replies) { $replies.Add($parent.replies) }
                                $replies.Add($newData)
                                $parent.replies = $replies.ToArray()
                            }
                        } else {
                            $posts.Add($newData)
                        }
                    }
                    
                    $posts.ToArray() | ConvertTo-Json -Depth 10 | Set-Content $boardFile
                    $resBody = @{ success = $true } | ConvertTo-Json
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($resBody)
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                elseif ($localPath -eq "api/board" -and $request.HttpMethod -eq "GET") {
                    $boardFile = Join-Path $PSScriptRoot "board.json"
                    $resBody = if (Test-Path $boardFile) { Get-Content $boardFile -Raw } else { "[]" }
                    if ([string]::IsNullOrWhiteSpace($resBody)) { $resBody = "[]" }
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($resBody)
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                else {
                    $response.StatusCode = 405 # Method Not Allowed
                }
            }
            else {
                # Static Files
                $filePath = Join-Path $PSScriptRoot $localPath
                if (Test-Path $filePath -PathType Leaf) {
                    $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $contentType = switch ($extension) {
                        ".html" { "text/html" }
                        ".css"  { "text/css" }
                        ".js"   { "application/javascript" }
                        ".webp" { "image/webp" }
                        ".png"  { "image/png" }
                        default { "application/octet-stream" }
                    }
                    $response.ContentType = $contentType
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } else {
                    $response.StatusCode = 404
                }
            }
        } catch {
            Write-Host "Error handling request: $_"
            $response.StatusCode = 500
        }
        $response.Close()
    }
} finally {
    $httpListener.Stop()
}

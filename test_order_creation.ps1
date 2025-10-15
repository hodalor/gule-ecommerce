# Login to get token
$loginResponse = Invoke-RestMethod -Uri 'http://localhost:8000/api/auth/login' -Method POST -ContentType 'application/json' -Body (ConvertTo-Json @{
    email = 'testuser@example.com'
    password = 'password123'
    userType = 'buyer'
})

$token = $loginResponse.accessToken
Write-Host 'Login successful, token obtained'

# Create order with correct format
$orderData = @{
    items = @(
        @{
            product = '68ed816f9d4bceee45b454af'
            quantity = 2
            unitPrice = 29.99
        }
    )
    shippingAddress = @{
        street = '123 Test Street'
        city = 'Test City'
        state = 'Test State'
        zipCode = '12345'
        country = 'Test Country'
    }
    paymentMethod = 'stripe'
    notes = 'Test order for debugging'
}

Write-Host 'Creating order with data:'
Write-Host ($orderData | ConvertTo-Json -Depth 3)

try {
    $headers = @{
        'Authorization' = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    
    $orderResponse = Invoke-RestMethod -Uri 'http://localhost:8000/api/orders' -Method POST -Headers $headers -Body (ConvertTo-Json $orderData -Depth 3)
    Write-Host 'Order created successfully:'
    Write-Host ($orderResponse | ConvertTo-Json -Depth 3)
} catch {
    Write-Host 'Order creation failed:'
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host 'Response body:'
        Write-Host $responseBody
    }
}

$baseUrl = 'https://enqamwnclvsowirnlpmt.supabase.co/rest/v1/productos'
$key = $env:SUPABASE_SERVICE_ROLE_KEY

if ([string]::IsNullOrWhiteSpace($key)) {
  throw 'Define SUPABASE_SERVICE_ROLE_KEY antes de ejecutar este script.'
}

$headers = @{
  'apikey' = $key
  'Authorization' = "Bearer $key"
  'Content-Type' = 'application/json'
}

$productos = @(
  @{ remoteId = '6d38c0d7-412b-4328-8316-78a72519816e'; nombre = 'Laptop Gamer Nitro X'; precio = 5200000; imagen = 'https://althiqa.com/wp-content/uploads/2022/06/01-16-1024x780.jpg'; specs = 'Intel i7 - RTX 3050 - 16GB RAM'; categoria = 'laptops'; stock = 10 },
  @{ remoteId = '6b02b8a1-a02a-4c15-a084-c998bbb218dc'; nombre = 'Desktop Pro Gamer'; precio = 8900000; imagen = 'https://tse2.mm.bing.net/th/id/OIP.0xuT25C7aWMIAGyCkZ1rHAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'; specs = 'Ryzen 9 - RTX 4080 - 32GB RAM'; categoria = 'desktops'; stock = 3 },
  @{ remoteId = 'a908fb7f-ba1a-4ebd-a09f-aa913280f6ac'; nombre = 'Monitor Curvo 27"'; precio = 1200000; imagen = 'https://m.media-amazon.com/images/I/71Fb6HV0QbL._AC_SL1500_.jpg'; specs = '240Hz - 1ms - QHD'; categoria = 'monitores'; stock = 8 },
  @{ remoteId = '02a3e49d-048e-453d-94a4-a6f20d1b791c'; nombre = 'Teclado Mecánico RGB'; precio = 350000; imagen = 'https://tse4.mm.bing.net/th/id/OIP.bPl3R1qP-Agt5mcttILp1QHaEK?rs=1&pid=ImgDetMain&o=7&rm=3'; specs = 'Switches Red - RGB'; categoria = 'accesorios'; stock = 4 },
  @{ remoteId = '22ef1c30-83ab-4a73-8ebe-6c58201c2329'; nombre = 'Mouse Gamer Pro'; precio = 280000; imagen = 'https://i5.walmartimages.com/asr/a6aa8e6d-4658-4523-8ae3-e093c32793c1_1.04c4c6c67a78ad775bff22ee92514a7b.jpeg'; specs = '26000 DPI - Inalambrico'; categoria = 'accesorios'; stock = 12 },
  @{ remoteId = '0ee009e9-c3d4-4653-b9e5-c683b18789fa'; nombre = 'Auriculares 7.1'; precio = 450000; imagen = 'https://tse3.mm.bing.net/th/id/OIP.X3iSlj7EWVPZC61zeH4C_QHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'; specs = 'Sonido envolvente - RGB'; categoria = 'accesorios'; stock = 5 },
  @{ remoteId = 'd08127af-f116-43f2-94e9-63c2615f6652'; nombre = 'Workstation Empresarial Z9'; precio = 12900000; imagen = 'https://xrshop.store/cdn/shop/products/hp-zbyhp-z1-g9-workstation-xrshop.png?v=1714734736&width=1946'; specs = 'Intel Xeon - 64GB RAM - SSD 2TB'; categoria = 'empresa'; stock = 8 },
  @{ remoteId = 'd7820e5c-35af-49bb-8c82-08999d306c73'; nombre = 'Servidor Rack Mini 8 Bahías'; precio = 15900000; imagen = 'https://tse2.mm.bing.net/th/id/OIP.9o2k5k1ycb0AqeCUpgbsywHaCf?rs=1&pid=ImgDetMain&o=7&rm=3'; specs = '32 Cores - ECC 128GB - RAID'; categoria = 'empresa'; stock = 5 },
  @{ remoteId = 'a6c66025-dd48-4898-8c4e-4dfcefcac5f5'; nombre = 'Laptop Ejecutiva Carbon Pro 14'; precio = 7400000; imagen = 'https://www.cyberpuerta.mx/img/product/XL/CP-LENOVO-20KGS47U00-1.jpg'; specs = 'Intel Ultra 7 - 32GB RAM - 1TB SSD'; categoria = 'empresa'; stock = 14 },
  @{ remoteId = '8f4594b1-adf4-4360-a7e4-962689e85049'; nombre = 'Kit Videoconferencia 4K Team'; precio = 3100000; imagen = 'https://www.omnimediaperu.com/wp-content/uploads/2022/09/equipo-de-videoconferencia-mvc860-yealink-omnimedia-peru.jpg'; specs = 'Camara 4K - Microfono 360 - AI Noise Cancel'; categoria = 'empresa'; stock = 20 },
  @{ remoteId = '08c417ae-401f-49e9-99d7-ff5fc1995f3f'; nombre = 'Firewall Corporativo SecureGate X'; precio = 5600000; imagen = 'https://nexcelsaudi.com/wp-content/uploads/2024/03/FG-1800F-jpg.webp'; specs = 'VPN - IDS/IPS - Gestion centralizada'; categoria = 'empresa'; stock = 10 }
)

try {
  foreach ($prod in $productos) {
    $id = $prod.remoteId
    $payload = @{
      nombre = $prod.nombre
      precio = $prod.precio
      imagen = $prod.imagen
      specs = $prod.specs
      categoria = $prod.categoria
      stock = $prod.stock
    }

    $json = $payload | ConvertTo-Json -Compress -Depth 5
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $patchUrl = "${baseUrl}?id=eq.$id"

    Invoke-RestMethod -Method Patch -Uri $patchUrl -Headers $headers -Body $bytes | Out-Null
    Write-Output "Actualizado: $($prod.nombre)"
  }

  Write-Output 'OK: catalogo sincronizado en Supabase'
} catch {
  Write-Output 'ERROR al sincronizar productos'
  Write-Output $_.Exception.Message
  if ($_.ErrorDetails.Message) { Write-Output $_.ErrorDetails.Message }
}

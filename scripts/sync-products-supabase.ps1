$baseUrl = 'https://enqamwnclvsowirnlpmt.supabase.co/rest/v1/productos'
$key = 'sb_publishable_tmJzoCw-61oxem5xP855SA_0ulZY7Yd'

$headers = @{
  'apikey' = $key
  'Authorization' = "Bearer $key"
  'Content-Type' = 'application/json'
}

$productos = @(
  @{ nombre = 'Laptop Gamer Nitro X'; precio = 5200000; imagen = 'https://althiqa.com/wp-content/uploads/2022/06/01-16-1024x780.jpg'; specs = 'Intel i7 - RTX 3050 - 16GB RAM'; categoria = 'laptops'; stock = 10 },
  @{ nombre = 'Desktop Pro Gamer'; precio = 8900000; imagen = 'https://tse2.mm.bing.net/th/id/OIP.0xuT25C7aWMIAGyCkZ1rHAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'; specs = 'Ryzen 9 - RTX 4080 - 32GB RAM'; categoria = 'desktops'; stock = 3 },
  @{ nombre = 'Monitor Curvo 27"'; precio = 1200000; imagen = 'https://m.media-amazon.com/images/I/71Fb6HV0QbL._AC_SL1500_.jpg'; specs = '240Hz - 1ms - QHD'; categoria = 'monitores'; stock = 8 },
  @{ nombre = 'Teclado Mecánico RGB'; precio = 350000; imagen = 'https://tse4.mm.bing.net/th/id/OIP.bPl3R1qP-Agt5mcttILp1QHaEK?rs=1&pid=ImgDetMain&o=7&rm=3'; specs = 'Switches Red - RGB'; categoria = 'accesorios'; stock = 4 },
  @{ nombre = 'Mouse Gamer Pro'; precio = 280000; imagen = 'https://i5.walmartimages.com/asr/a6aa8e6d-4658-4523-8ae3-e093c32793c1_1.04c4c6c67a78ad775bff22ee92514a7b.jpeg'; specs = '26000 DPI - Inalambrico'; categoria = 'accesorios'; stock = 12 },
  @{ nombre = 'Auriculares 7.1'; precio = 450000; imagen = 'https://tse3.mm.bing.net/th/id/OIP.X3iSlj7EWVPZC61zeH4C_QHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'; specs = 'Sonido envolvente - RGB'; categoria = 'accesorios'; stock = 5 },
  @{ nombre = 'Workstation Empresarial Z9'; precio = 12900000; imagen = 'https://xrshop.store/cdn/shop/products/hp-zbyhp-z1-g9-workstation-xrshop.png?v=1714734736&width=1946'; specs = 'Intel Xeon - 64GB RAM - SSD 2TB'; categoria = 'empresa'; stock = 8 },
  @{ nombre = 'Servidor Rack Mini 8 Bahías'; precio = 15900000; imagen = 'https://tse2.mm.bing.net/th/id/OIP.9o2k5k1ycb0AqeCUpgbsywHaCf?rs=1&pid=ImgDetMain&o=7&rm=3'; specs = '32 Cores - ECC 128GB - RAID'; categoria = 'empresa'; stock = 5 },
  @{ nombre = 'Laptop Ejecutiva Carbon Pro 14'; precio = 7400000; imagen = 'https://www.cyberpuerta.mx/img/product/XL/CP-LENOVO-20KGS47U00-1.jpg'; specs = 'Intel Ultra 7 - 32GB RAM - 1TB SSD'; categoria = 'empresa'; stock = 14 },
  @{ nombre = 'Kit Videoconferencia 4K Team'; precio = 3100000; imagen = 'https://www.omnimediaperu.com/wp-content/uploads/2022/09/equipo-de-videoconferencia-mvc860-yealink-omnimedia-peru.jpg'; specs = 'Camara 4K - Microfono 360 - AI Noise Cancel'; categoria = 'empresa'; stock = 20 },
  @{ nombre = 'Firewall Corporativo SecureGate X'; precio = 5600000; imagen = 'https://nexcelsaudi.com/wp-content/uploads/2024/03/FG-1800F-jpg.webp'; specs = 'VPN - IDS/IPS - Gestion centralizada'; categoria = 'empresa'; stock = 10 }
)

try {
  $existentes = Invoke-RestMethod -Method Get -Uri "${baseUrl}?select=id,nombre" -Headers $headers
  $mapaPorNombre = @{}

  foreach ($p in $existentes) {
    if (-not $mapaPorNombre.ContainsKey($p.nombre)) {
      $mapaPorNombre[$p.nombre] = $p.id
    }
  }

  foreach ($prod in $productos) {
    $json = $prod | ConvertTo-Json -Compress -Depth 5
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

    try {
      if ($mapaPorNombre.ContainsKey($prod.nombre)) {
        $id = $mapaPorNombre[$prod.nombre]
        $patchUrl = "${baseUrl}?id=eq.$id"
        Invoke-RestMethod -Method Patch -Uri $patchUrl -Headers $headers -Body $bytes | Out-Null
        Write-Output "Actualizado: $($prod.nombre)"
      } else {
        Invoke-RestMethod -Method Post -Uri $baseUrl -Headers $headers -Body $bytes | Out-Null
        Write-Output "Insertado: $($prod.nombre)"
      }
    } catch {
      Write-Output "Fallo: $($prod.nombre)"
      Write-Output $_.Exception.Message
      if ($_.ErrorDetails.Message) { Write-Output $_.ErrorDetails.Message }
    }
  }

  Write-Output 'OK: catalogo sincronizado en Supabase'
} catch {
  Write-Output 'ERROR al sincronizar productos'
  Write-Output $_.Exception.Message
  if ($_.ErrorDetails.Message) { Write-Output $_.ErrorDetails.Message }
}

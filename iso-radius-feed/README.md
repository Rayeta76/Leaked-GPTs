# Reductor de velocidad en radios (ISO)

`index.html` es una aplicación de un solo archivo: ábrela con doble clic en el navegador, sin instalar nada.

1. Abre el `.cni` (o pega el texto).
2. Marca los radios que quieres frenar (por defecto, los externos de R ≤ 30 mm) y escribe la velocidad de cada uno.
3. Descarga el ISO modificado.

Escribe el frenado de forma explícita: `F` baja en el arco y en N mm de recta antes y después, y vuelve a la `F` original. La geometría no cambia.

Pruebas: `node test/run.js`. En `samples/` hay los dos programas transcritos de las fotos.

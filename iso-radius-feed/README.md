# Reductor de velocidad en radios (ISO)

`index.html` es una aplicación de un solo archivo: ábrela con doble clic en el navegador, sin instalar nada.

1. Abre el `.cni` (o pega el texto).
2. La app separa los radios por herramienta (`ST1="…"`, con la descripción de `[LAVORAZIONI]`). Las entradas y salidas (p. ej. R75) se detectan y no se tocan.
   Se preseleccionan solo las herramientas que aún no frenan en los radios; cada cliente puede usar sus propios códigos.
3. Indica la velocidad (mm/min) y el tramo recto para cada radio, revisa la vista con etiquetas y la simulación de la muela a escala.
4. Descarga el ISO modificado (`nombre_vel.cni`).

Escribe el frenado de forma explícita: `F` baja en el arco y en N mm de recta antes y después, y vuelve a la `F` original. La geometría no cambia.

Pruebas: `node test/run.js`. En `samples/` están `saez1.CNI` (real) y los dos fragmentos transcritos de las fotos.

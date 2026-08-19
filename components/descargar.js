// components/descargar.js
//
// Descarga un archivo que sirve el API.
//
// No sirve un <a href="..."> normal: esas rutas exigen el token en la cabecera
// Authorization y un enlace no la manda. Hay que pedir el archivo con axios,
// convertirlo en un enlace temporal en memoria y pulsarlo por código.
"use client";
import expressApi from "../lib/expressApi";

// Saca el nombre del archivo de la cabecera Content-Disposition que manda el
// servidor. Si no viene, se usa el de respaldo.
function nombreDesdeCabecera(headers, respaldo) {
  const cd = headers?.["content-disposition"] || "";
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  return m ? decodeURIComponent(m[1].replace(/"/g, "").trim()) : respaldo;
}

/**
 * @param {string} ruta        ej. "/reportes/pdf"
 * @param {object} params      querystring, ej. { desde, hasta }
 * @param {string} nombreBase  nombre por si el servidor no manda ninguno
 */
export async function descargarArchivo(ruta, params = {}, nombreBase = "archivo") {
  const res = await expressApi.get(ruta, { params, responseType: "blob" });

  // Cuando algo falla, el API responde JSON aunque hayamos pedido un blob.
  // Sin esto el navegador bajaría un archivo con el error adentro.
  if (res.data?.type === "application/json") {
    const texto = await res.data.text();
    let mensaje = "No se pudo generar el archivo";
    try { mensaje = JSON.parse(texto).message || mensaje; } catch {}
    throw new Error(mensaje);
  }

  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreDesdeCabecera(res.headers, nombreBase);
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Liberar el objeto: si no, el blob se queda en memoria hasta recargar
  URL.revokeObjectURL(url);
}

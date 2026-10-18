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
//
// Ojo: para que el navegador deje leer esta cabecera, el API tiene que
// exponerla en su configuración de CORS (exposedHeaders: ['Content-Disposition']
// en app.js). Sin eso siempre cae en el respaldo.
function nombreDesdeCabecera(headers, respaldo) {
  const cd = headers?.["content-disposition"] || "";
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  if (!m) return respaldo;
  try {
    return decodeURIComponent(m[1].replace(/"/g, "").trim());
  } catch {
    // Un nombre con un % suelto rompe decodeURIComponent; mejor el crudo
    return m[1].replace(/"/g, "").trim() || respaldo;
  }
}

// ¿El cuerpo es el JSON de un error en vez del archivo pedido?
const esJSON = (cuerpo) =>
  typeof Blob !== "undefined" &&
  cuerpo instanceof Blob &&
  String(cuerpo.type || "").includes("json");

// Saca el mensaje que mandó el servidor.
//
// Con responseType:"blob" el cuerpo del error TAMBIÉN llega como Blob, así que
// axios no lo puede leer y suelta un genérico "Request failed with status code
// 500". El mensaje de verdad está adentro del blob y hay que abrirlo a mano,
// que si no el usuario ve un número en vez de qué pasó.
async function mensajeDelServidor(cuerpo, respaldo) {
  if (!esJSON(cuerpo)) return respaldo;
  try {
    const { message, error } = JSON.parse(await cuerpo.text());
    return message || error || respaldo;
  } catch {
    return respaldo;
  }
}

/**
 * @param {string} ruta        ej. "/reportes/pdf"
 * @param {object} params      querystring, ej. { desde, hasta }
 * @param {string} nombreBase  nombre por si el servidor no manda ninguno
 */
export async function descargarArchivo(ruta, params = {}, nombreBase = "archivo") {
  let res;
  try {
    res = await expressApi.get(ruta, { params, responseType: "blob" });
  } catch (err) {
    const porDefecto =
      err?.response?.status === 403
        ? "No tenés permiso para descargar este documento"
        : err?.response?.status === 404
        ? "No se encontró el documento"
        : "No se pudo generar el archivo";
    throw new Error(await mensajeDelServidor(err?.response?.data, porDefecto));
  }

  // Algunas rutas responden 200 con un JSON de aviso en vez del archivo.
  // Sin esto el navegador bajaría un archivo con el error adentro.
  if (esJSON(res.data)) {
    throw new Error(await mensajeDelServidor(res.data, "No se pudo generar el archivo"));
  }

  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreDesdeCabecera(res.headers, nombreBase);
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Liberar el objeto: si no, el blob se queda en memoria hasta recargar.
  // Se espera un momento porque algunos navegadores cancelan la descarga si
  // la URL se revoca en el mismo instante en que se pulsa el enlace.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

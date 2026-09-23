/* ==================================================================
   ===============           CONFIGURACIÓN            ===============
   ==================================================================
   Todo lo que define "de qué se compone" la aplicación vive aquí.
   Para agregar un módulo nuevo basta con sumar un objeto a MENU
   y escribir su función render (ver el bloque final del archivo:
   "CÓMO AGREGAR UN MÓDULO NUEVO").
   ================================================================== */

const APP = {
  version: '1.1',
  storageKey: 'mies_ot_cicloconvertidores_v3'
};
/* Carpeta del contrato en Google Drive (editable después en el Módulo 09) */
const CARPETA_DRIVE_URL = 'https://drive.google.com/drive/folders/1AMPknVM0vV6eBRyXKo7snW__kNlnwzKg';
/* Archivos de la carpeta Construccion en Google Drive (compartida con enlace, lector): nombre → URL */
const DRIVE_ARCHIVOS = {
 "BUS CONFIGURATION & COMMUNICATION OVERVIEW_5.001.pdf": "https://drive.google.com/file/d/1sXJwmEFuZynBl3BieLQBjiLObpMBWA2f/view",
 "DIAGRAMA UNILINEAL SISTEMA DE DISTRIBUCIÓN BT_5.003.pdf": "https://drive.google.com/file/d/1sostDSzbsWwAXr0qbaLJBXIS-Xsu2MnZ/view",
 "LISTADO CABLES DE FUERZA, CONTROL Y COMUNICACIÓN_4.001.pdf": "https://drive.google.com/file/d/1UvMgFVTsOw4PI3VKDwyDlZfgE3NDMvxg/view",
 "CP-M0374-01-WM-EAB101.pdf": "https://drive.google.com/file/d/1hgbAJpyZVcas1jWS70sk7a9sR-K9n0Bf/view",
 "4502319491-03221-MNLME-0001.pdf": "https://drive.google.com/file/d/1wi5sLll4RO610HqGKo7Ci09RgroLrZ3m/view",
 "4502319491-03221-MDCME-00002.pdf": "https://drive.google.com/file/d/12nSeoJ84KJVrRyjWAD0qX_t2mtytZ91n/view",
 "4502319491-03221-MDCME-00001 Rev 2.pdf": "https://drive.google.com/file/d/10sKM3kHks4y7rn8W-0bVAFGeIKrPUbgT/view",
 "4502319491-03221-LSTAT-00001_1.pdf": "https://drive.google.com/file/d/1coZxqrrCIiZpgvfp4aEpo6oR9yqj9ll-/view",
 "4502319491-03221-HDDME-00001.pdf": "https://drive.google.com/file/d/1TcOm5IbSXMRRVzw8ZUU0uDHjAlJEJwo_/view",
 "4502319491-03221-ESPME-00001.pdf": "https://drive.google.com/file/d/1L0bKaMdBO0BvWlAyqrBH8zMSeCOKBbM0/view",
 "4502319491-03221-CEREL-0003.pdf": "https://drive.google.com/file/d/1fIA2jCJz7Xg4lo5UWmMMJOmuCBLEViCT/view",
 "4502319491-03221-500ME-0001.pdf": "https://drive.google.com/file/d/1eABGg9vr2HGsZWgOYfA0AVoLMHnL7JXY/view",
 "4502319491-03221-413AT-00001.pdf": "https://drive.google.com/file/d/1DDTzGuGanqgRHQv5iKPFTAwsr9xI77qP/view",
 "4502319491-03221-402EL-00001.pdf": "https://drive.google.com/file/d/1jxTp590lnOslbPLSohyFdkYq4GrZNjn8/view",
 "4502319491-03221-401EL-00002.pdf": "https://drive.google.com/file/d/1B_jQJJKJ1NUJQheLY81e96BSslUDdUwp/view",
 "4502319491-03221-401EL-00001.pdf": "https://drive.google.com/file/d/1t6wLIUeAyVgWvphaoJ5-2k83G0rcvIcx/view",
 "4502319491-03221-400ME-0001 Rev B.pdf": "https://drive.google.com/file/d/1nR_gVmXyCzH2x6Brackk3gUk0EErJcZc/view",
 "4502319491-03221-400ME-00002.pdf": "https://drive.google.com/file/d/1cdCfiYMZttTwVi9UxnJATxejmWEnNYIT/view",
 "4502319491-03221-400ME-00001.pdf": "https://drive.google.com/file/d/1MQEN3cMcKlSnNvRzT9iMBQ9HhO0Ku9VE/view",
 "4502319491-03221-300EL-0002.pdf": "https://drive.google.com/file/d/17sSCPFAGpPt0riBH2O6J0xWmGr65nuSJ/view",
 "4502319491-03221-300EL-0001.pdf": "https://drive.google.com/file/d/1HqThUY_IPHJ8zsyA3Guf5niZTuzfkXAv/view",
 "4502319491-03221-202EL-0002.pdf": "https://drive.google.com/file/d/1U8iP8LXDGxDlOWvWz6Vlg67HSOzHOXFD/view",
 "4502319491-03221-202EL-00001.pdf": "https://drive.google.com/file/d/1C6DnoZL9EV-iIuLmdEvfP0fqyJgfIrtx/view",
 "4502319491-03221-200ME-00003.pdf": "https://drive.google.com/file/d/1YoP50gIzzN7kPNTswv_C2p_U0vFIkrUA/view",
 "4502319491-03221-200ME-00003 Rev B.pdf": "https://drive.google.com/file/d/1akkp5xn8vn94MDbkEvC92xotaRrdbY_c/view",
 "4502319491-03221-106EL-00001 Rev B.pdf": "https://drive.google.com/file/d/1iuGqUkd-tIf6GJ5rgUBdIF8cb9XwhUti/view",
 "4502319491-03221-105EL-0002 Rev B.pdf": "https://drive.google.com/file/d/1ffBDIfCzJmyEKMJwDND1P-xDfyAOQ-aA/view",
 "4502319491-03221-105EL-0002 Rev 0.pdf": "https://drive.google.com/file/d/1kroicdgGtepjtyrLqXnYajlTmKebyEit/view",
 "4502319491-03221-104ME-00001.pdf": "https://drive.google.com/file/d/1_f6onQiw3y7g_l6P65JQSG_DJuH6ePcx/view",
 "4502319491-03221-100ME-00003.pdf": "https://drive.google.com/file/d/1xpDF4VClUj9A27GTNsHmK-lVAtiOgsCT/view",
 "4502319491-03221-100ME-00002.pdf": "https://drive.google.com/file/d/1FifNxlxPMl2KHULH5ya_146ayftbqEXk/view",
 "4502319491-03221-100ME-00001.pdf": "https://drive.google.com/file/d/18976R5f95Kgof-XoiEXHfdx85P37xNS8/view",
 "4502319491-03221-100ME-00001 Rev 0.pdf": "https://drive.google.com/file/d/1ZmPd6sX1LSVJLRSZcHlMPVd-0LIOdJ5H/view",
 "4502319491-03221-100EL-00001.pdf": "https://drive.google.com/file/d/1dO5WA6BDGK6UKv8GzK50mKaR6o_AcZIJ/view",
 "4502319491-03221-100EL-00001 Rev 0.pdf": "https://drive.google.com/file/d/1kgZLvb7Y0ygFl5vHlBgykPghkqlJPRFM/view",
 "45002319491-03221-104ME-00002.pdf": "https://drive.google.com/file/d/1KWbARcuK2KtiGbDD7uIWTZmseQZnKv95/view",
 /* Ingeniería de terreno R&Q */
 "4600029647-028-03221-LSTEL-00005_B.pdf": "https://drive.google.com/file/d/17CdiA3QWXpoTi5SyH6csjJkI6aJzhf_C/view",
 "4600029647-028-03221-LSTEL-00004_B.pdf": "https://drive.google.com/file/d/1Hj4YyeDr6dyPFiVs7Hll6Bqv9Mbh30m9/view",
 "4600029647-028-03221-LSTEL-00003_B.pdf": "https://drive.google.com/file/d/1XyD14ZvnYr1DHdjsjvPOWtywYcWMHG6f/view",
 "4600029647-028-03221-LSTEL-00002_B.pdf": "https://drive.google.com/file/d/1x_b9XfPmc-MriRhhGPLZMZQo77VgUSLM/view",
 "4600029647-028-03221-INFEL-00010_B.pdf": "https://drive.google.com/file/d/1Dl2s5O4wRAXblcLkKhEU_7Fbnjwq8APc/view",
 "4600029647-028-03221-300CI-00002_1.pdf": "https://drive.google.com/file/d/1JV2ixMnDmy6oFHeiXHArM727EQdumSIL/view",
 "4600029647-028-03221-300CI-00001_1.pdf": "https://drive.google.com/file/d/1XV2rBDlQ0yHxypoH49geoq2oVgG5u8XV/view",
 "4600029647-028-03221-205EL-00001_B.pdf": "https://drive.google.com/file/d/1-rh27P9h0eIgvtbSh_fwnpdAAUK4M30o/view"
};
function driveDe(nombre){ return DRIVE_ARCHIVOS[str(nombre)] || ''; }
const EMISOR_INN = 'Innomotics (proveedor CCV)';
const EMISOR_RQ  = 'R&Q Ingeniería S.A. (ingeniería de terreno, contrato 4600029647)';
/* Quién emite cada familia de códigos: se usa al dar de alta PDF nuevos desde la carpeta.
   Agregue aquí otros emisores cuando aparezcan nuevas familias de códigos. */
const EMISORES_POR_PREFIJO = [
  { re: /^4502319491-03221-/i,     emisor: EMISOR_INN, area: 'Sala Eléctrica Modular (E-House CCV)', fase: 'Detalle' },
  { re: /^45002319491-03221-/i,    emisor: EMISOR_INN, area: 'Sala Eléctrica Modular (E-House CCV)', fase: 'Detalle' },
  { re: /^CP-M\d+/i,               emisor: EMISOR_INN, area: 'Sala Eléctrica Modular (E-House CCV)', fase: 'Detalle' },
  { re: /^4600029647-028-03221-/i, emisor: EMISOR_RQ,  area: '3200 Molienda SAG — Cambio Cicloconvertidor (03221)', fase: 'Detalle' },
  { re: /^ANEXO5-/i,               emisor: 'CODELCO División Andina (Anexo 5 BT)', area: 'Sala Eléctrica Modular (E-House CCV)', fase: 'Detalle' },
  { re: /^BT-/i,                   emisor: 'CODELCO División Andina (mandante)', area: 'Contrato', fase: 'Básica' }
];
/* ---- Simuladores 3D (archivos independientes en la subcarpeta "simuladores") ----
   Cada simulador es un HTML autónomo. Para agregar otro: copie el archivo a la
   carpeta simuladores/ y sume una fila aquí. */
const SIMULADORES = [
  { id:'molino',    archivo:'simuladores/Simulador_Molino_Siemens.html', icono:'⚙️',
    titulo:'Simulador del molino y cicloconvertidor Siemens',
    resumen:'Laboratorio interactivo 3D del accionamiento: red y transformadores, cicloconvertidor SINAMICS SL150, motor anillo de 12.000 kW / 9,52 rpm, excitación y refrigeración. Permite variar la velocidad y observar el flujo de energía.',
    fuente:'Modelo didáctico basado en el unilineal 202EL-00001 y el catálogo Siemens SINAMICS SL150.' },
  { id:'recorrido', archivo:'simuladores/Recorrido_Sala_Electrica.html', icono:'🏭',
    titulo:'Recorrido virtual de la sala eléctrica (E-House)',
    resumen:'Recorrido 3D por la sala eléctrica modular del cicloconvertidor: unidad de enfriamiento +.B20, cicloconvertidores +.B21 / +.B22, servicios auxiliares +.B36, HVAC, transformadores de corriente y sistema de incendio. Se puede caminar dentro de la sala e inspeccionar cada equipo.',
    fuente:'Distribución según plano Innomotics 100ME-00001 Rev. 0.' },
  { id:'armado',    archivo:'simuladores/Armado_Estructura_Sala.html', icono:'🏗️',
    titulo:'Armado de la estructura de la sala (secuencia de montaje)',
    resumen:'Animación paso a paso del armado de la estructura tipo mecano de la sala: módulos M10 → M1, corona, cerchas y diagonales de techo, con dimensiones, pesos y pernería de cada módulo. Referencia visual para la partida de montaje de la E-House.',
    fuente:'Manual de montaje Innomotics MNLME-0001 Rev. 0 y plano de armado 200ME-00003 Rev. B.' }
];

/* ---- Clave de administrador ----
   La app se abre en MODO LECTURA: nadie puede crear, editar ni borrar.
   Con la clave se habilita la edición en ese navegador (hasta cerrar la pestaña
   o pulsar "Bloquear"). Aquí se guarda solo el hash SHA-256 de la clave. */
const ADMIN_HASH = 'da422c8d054eef78c6ce6ca63679c0341f9a954a574ab26fcdbc294771bd3244';

function emisorPorCodigo(c){
  for(let i=0;i<EMISORES_POR_PREFIJO.length;i++) if(EMISORES_POR_PREFIJO[i].re.test(str(c))) return EMISORES_POR_PREFIJO[i];
  return null;
}

/* ---- Árbol del menú principal (modular y ampliable) -------------- */
const MENU = [
  {
    id: 'dashboard', code: '00', label: 'Panel de Control',
    icon: 'chart', route: 'dashboard', render: 'renderDashboard'
  },
  {
    id: 'ingenieria', code: '01', label: 'Ingeniería Recibida', icon: 'folder',
    children: [
      { id: 'matriz',   label: '1.1 Matriz de documentos recibidos', route: 'ingenieria/matriz',   render: 'renderMatriz' },
      { id: 'revs',     label: '1.2 Control de revisiones',          route: 'ingenieria/revisiones', render: 'renderRevisiones' },
      { id: 'terreno',  label: '1.3 Trazabilidad a terreno',         route: 'ingenieria/terreno',  render: 'renderTerreno' },
      { id: 'stats',    label: '1.4 Estadísticas de ingeniería',     route: 'ingenieria/estadisticas', render: 'renderEstadisticas' },
      { id: 'circ',     label: '1.5 Listado de circuitos y cables',   route: 'ingenieria/circuitos',    render: 'renderCircuitos' }
    ]
  },
  {
    id: 'calidad', code: '02', label: 'Calidad (PIE / ITP / Protocolos)', icon: 'folder',
    route: 'calidad', wip: true,
    wipDesc: 'Administrará el Plan de Inspección y Ensayo del contrato: matriz PIE/ITP por actividad y sistema, definición de hold points y witness points, protocolos de montaje y pruebas eléctricas (megado, torque, continuidad, puesta a tierra, pruebas funcionales de cicloconvertidores), estado de firma del mandante y carpeta de calidad para entrega final (dossier).',
    wipItems: ['Matriz PIE / ITP por sistema y actividad', 'Hold points y witness points con aviso al mandante',
               'Protocolos y registros de ensayo con estado de firma', 'Dossier de calidad y entregable final']
  },
  {
    id: 'ncr', code: '03', label: 'No Conformidades y Observaciones', icon: 'folder',
    route: 'ncr', wip: true,
    wipDesc: 'Registro y seguimiento de NCR, observaciones de terreno y acciones correctivas: origen, descripción, disciplina, criticidad, responsable, plazo de cierre, evidencia de cierre y verificación. Consumirá los números de NCR que hoy se anotan como texto en la Trazabilidad a terreno.',
    wipItems: ['Libro de NCR con estado y plazo de cierre', 'Observaciones de terreno y del mandante',
               'Acciones correctivas y verificación de eficacia', 'Indicadores de recurrencia por disciplina']
  },
  {
    id: 'docctrl', code: '04', label: 'Control Documental (emitidos)', icon: 'folder',
    route: 'docctrl', wip: true,
    wipDesc: 'Control de la documentación que MIES emite hacia CODELCO: transmittals de salida, correlativo de emisión, revisiones, estado de aprobación del mandante y planos as-built. Es el espejo del Módulo 01, pero en sentido contrario.',
    wipItems: ['Correlativo y libro de transmittals emitidos', 'Estado de aprobación por el mandante',
               'Control de as-built y planos conforme a obra', 'Lista maestra de documentos del contrato']
  },
  {
    id: 'plan', code: '05', label: 'Planificación y Avance', icon: 'folder',
    route: 'plan', wip: true,
    wipDesc: 'Programa del contrato y avance físico: hitos contractuales, curva S planificada vs. real, avance por sistema y disciplina, restricciones y desviaciones de plazo con su impacto sobre la ingeniería liberada para construcción.',
    wipItems: ['Hitos contractuales y fechas comprometidas', 'Curva S plan vs. real y avance por disciplina',
               'Registro de restricciones y desviaciones', 'Informe semanal de avance']
  },
  {
    id: 'mat', code: '06', label: 'Materiales y Suministros', icon: 'folder',
    route: 'mat', wip: true,
    wipDesc: 'Trazabilidad de materiales y suministros críticos: lista de materiales por documento de ingeniería, estado de compra, fecha de llegada a faena, certificados de calidad del fabricante y liberación para montaje.',
    wipItems: ['Lista de materiales vinculada a la ingeniería recibida', 'Estado de compra y fecha comprometida en faena',
               'Certificados de calidad y trazabilidad de lote', 'Liberación de materiales para montaje']
  },
  {
    id: 'norma', code: '07', label: 'Normativa y Estándares Aplicables', icon: 'folder',
    route: 'norma', wip: true,
    wipDesc: 'Biblioteca de la normativa contractual y técnica aplicable (NCh Elec. 4/2003, IEC, IEEE, estándares CODELCO, reglamento de seguridad minera D.S. 132) con su vínculo a los documentos y protocolos que la invocan, y control de versión vigente de cada estándar.',
    wipItems: ['Listado de normas y estándares con versión vigente', 'Estándares y especificaciones propias de CODELCO',
               'Vínculo norma ↔ documento / protocolo', 'Alertas por cambio de versión de una norma']
  },
  {
    id: 'rep', code: '08', label: 'Reportes y Exportación', icon: 'folder',
    route: 'rep', wip: true,
    wipDesc: 'Generación de reportes formales para el mandante: informe de estado de ingeniería, listado de comentarios abiertos, reporte de discrepancias de terreno y respaldo completo del contrato, en formatos imprimibles y exportables.',
    wipItems: ['Informe de estado de ingeniería (periódico)', 'Reporte de comentarios y NCR abiertos',
               'Exportación consolidada del contrato', 'Formatos imprimibles con cabecera del contrato']
  },
  {
    id: 'config', code: '09', label: 'Configuración del Contrato', icon: 'gear',
    route: 'config', render: 'renderConfig'
  },
  {
    id: 'guia', code: '10', label: 'Guía del Proyecto (didáctica)', icon: 'book',
    children: [
      { id: 'ccv',     label: '10.1 ¿Cómo funciona el cicloconvertidor?', route: 'guia/cicloconvertidor', render: 'renderGuiaCCV' },
      { id: 'unifilar',label: '10.2 Unilineal explicado bloque a bloque', route: 'guia/unilineal',        render: 'renderGuiaUnilineal' },
      { id: 'alcance', label: '10.3 Alcance del contrato (Bases Técnicas)', route: 'guia/alcance',       render: 'renderGuiaAlcance' },
      { id: 'glosario',label: '10.4 Glosario y documentos clave',         route: 'guia/glosario',        render: 'renderGuiaGlosario' },
      { id: 'sim',     label: '10.5 Simuladores 3D',                      route: 'guia/simuladores',     render: 'renderSimuladores' }
    ]
  }
];

/* ---- Listas de valores (catálogos) ------------------------------- */
const DISCIPLINAS = ['Eléctrica','Instrumentación y Control','Mecánica','Piping','Estructuras','Civil','HVAC','Arquitectura','Multidisciplina'];
const TIPOS_DOC   = ['Plano','Memoria de cálculo','Especificación técnica','Lista de materiales','Diagrama unilineal','P&ID','Layout','Datasheet','Procedimiento','Otro'];
const FASES       = ['Conceptual','Básica','Detalle','As-Built'];
const FORMATOS    = ['PDF','DWG','XLSX','DOCX','Nativo'];

const ESTADOS_REV = [
  { id:'recibido',    label:'Recibido',                      cls:'recibido',    cerrado:false, color:'#6b7684' },
  { id:'revision',    label:'En revisión',                   cls:'revision',    cerrado:false, color:'#1a6ba8' },
  { id:'comentarios', label:'Con comentarios',               cls:'comentarios', cerrado:false, color:'#c58b1a' },
  { id:'aprobcom',    label:'Aprobado con comentarios',      cls:'aprobcom',    cerrado:true,  color:'#78b85c' },
  { id:'aprobado',    label:'Aprobado',                      cls:'aprobado',    cerrado:true,  color:'#2e8b4f' },
  { id:'rechazado',   label:'Rechazado',                     cls:'rechazado',   cerrado:true,  color:'#c0392b' },
  { id:'superado',    label:'Superado por nueva revisión',   cls:'superado',    cerrado:true,  color:'#5b6672' }
];
const ESTADOS_FINALES = ['Vigente para construcción','Superado','Anulado'];
const INCORPORACION   = ['Sí','Parcial','No','No aplica'];
const CRITICIDADES    = ['Alta','Media','Baja'];
const EST_COMENTARIO  = ['Abierto','Respondido','Cerrado','Rechazado'];
const EST_TERRENO     = ['No verificado','Verificado conforme','Discrepancia detectada'];
const IMPACTOS        = ['Diseño','Plazo','Costo','Seguridad'];
const ACCIONES_DISC   = ['Consulta técnica (RFI)','Modificación de ingeniería','Aceptar como está','Por definir'];
const EST_RFI         = ['No aplica','Emitida','En respuesta del mandante','Respondida','Cerrada'];

/* Textos de ayuda contextual (se muestran en el ícono "?" y paneles) */
const AYUDA = {
  matriz: 'Registro maestro de <b>toda la ingeniería que la oficina técnica recibe</b> del mandante, de la ingeniería de detalle o del proveedor. Cada fila es un documento en su revisión vigente. Lo alimenta el encargado de control documental al recibir cada transmittal.',
  revs: 'Historial completo de cada documento: <b>ninguna revisión se sobrescribe</b>. Aquí se registra el ciclo de comentarios (emisión, respuesta del emisor y cierre) que define si el documento puede liberarse para construcción. Lo alimentan los revisores de cada disciplina.',
  terreno: 'Conecta el papel con la obra: confirma si lo que dice la ingeniería recibida <b>coincide con lo levantado en terreno</b>. Toda discrepancia detectada debe derivar en un RFI, una modificación de ingeniería o una aceptación formal. Lo alimenta el ingeniero de terreno.',
  stats: 'Indicadores para la reunión de avance con el mandante: cuánta ingeniería está liberada, cuánta está atrasada en revisión y dónde se concentran los comentarios. Se calcula solo, no requiere carga manual.',
  config: 'Datos de cabecera del contrato y parámetros de cálculo. Lo llena el administrador de contrato al inicio. <b>Ningún dato está fijo en el código</b>: todo lo que se edite aquí se refleja en el resto de la aplicación y en los reportes.',
  dashboard: 'Resumen de una mirada del estado de la oficina técnica: qué llegó, qué está en revisión, qué está vencido y qué tiene discrepancias sin resolver.'
};

/* ==================================================================
   ===============          MODELO DE DATOS           ===============
   ==================================================================
   DB es el único objeto con estado persistente. Estructura:

   DB = {
     contrato: { ...datos de cabecera editables... },
     params:   { plazoRevisionDias, usarDiasHabiles },
     correlativo: <número interno siguiente>,
     documentos: [ Documento ]
   }

   Documento = {
     id, correlativo, codigo, titulo, disciplina, tipo, fase, area,
     emisor, enlace (ruta relativa o URL), enlaceDrive (URL Drive),
     formatos:[], estadoFinal, observaciones,
     terreno: { estado, rfiNumero, rfiEstado, ncr, discrepancias:[Discrepancia] },
     revisiones: [ Revision ]          // la ÚLTIMA es la revisión vigente
   }

   Revision = {
     id, rev, fechaRecepcion, transmittal, motivo, incorporacion,
     revisor, fechaInicioRevision, estado, fechaRespuesta,
     plazoDias, nComentarios, archivo (PDF de esa revisión), comentarios:[ Comentario ]
   }

   Comentario  = { id, n, descripcion, disciplina, criticidad, respuesta, estado, fechaCierre }
   Discrepancia= { id, descripcion, fecha, responsable, referencia, impacto:[], accion, resuelta }
   ================================================================== */

function contratoPorDefecto(){
  return {
    proyecto:    'Reemplazo de Cicloconvertidores — Molino SAG',
    mandante:    'CODELCO División Andina',
    contratista: 'MIES',
    nContrato:   '',
    ods:         '',
    fechaInicio: '',
    fechaTermino:'',
    adminContrato:'',
    jefeOT:      '',
    jefeCalidad: '',
    carpetaDrive: CARPETA_DRIVE_URL
  };
}
function paramsPorDefecto(){
  return { plazoRevisionDias: 10, usarDiasHabiles: true };
}
function dbVacia(){
  return { contrato: contratoPorDefecto(), params: paramsPorDefecto(), correlativo: 1, documentos: [], circuitos: {} };
}

let DB = dbVacia();

/* ==================================================================
   ===============            PERSISTENCIA            ===============
   ==================================================================
   localStorage con try/catch en cada lectura y escritura: si el
   navegador bloquea el almacenamiento, la app sigue funcionando en
   memoria y solo avisa una vez.
   ================================================================== */

let ALMACEN_OK = true;

function cargarDB(){
  let crudo = null;
  try { crudo = localStorage.getItem(APP.storageKey); }
  catch(e){ ALMACEN_OK = false; console.warn('localStorage no disponible:', e); }

  if(!crudo){ DB = dbVacia(); DB.documentos = datosDeEjemplo(); DB.correlativo = DB.documentos.length + 1; guardarDB(); return; }

  try{
    const obj = JSON.parse(crudo);
    DB = normalizarDB(obj);
  }catch(e){
    console.warn('Datos guardados ilegibles, se parte de cero:', e);
    DB = dbVacia(); DB.documentos = datosDeEjemplo(); DB.correlativo = DB.documentos.length + 1;
  }
}

function guardarDB(){
  try{ localStorage.setItem(APP.storageKey, JSON.stringify(DB)); }
  catch(e){
    if(ALMACEN_OK){ ALMACEN_OK = false; toast('No se pudo guardar en este navegador. Los cambios existen solo mientras la pestaña esté abierta: exporte un respaldo JSON.', 'bad', 9000); }
    console.warn('Error al guardar:', e);
  }
}

/* Rellena campos faltantes de una base importada o antigua */
function normalizarDB(obj){
  const base = dbVacia();
  const db = {
    contrato: Object.assign(contratoPorDefecto(), (obj && obj.contrato) || {}),
    params:   Object.assign(paramsPorDefecto(),   (obj && obj.params)   || {}),
    correlativo: (obj && Number(obj.correlativo)) || 1,
    documentos: Array.isArray(obj && obj.documentos) ? obj.documentos : [],
    circuitos: (obj && obj.circuitos && typeof obj.circuitos === 'object') ? obj.circuitos : {}
  };
  db.documentos = db.documentos.map(normalizarDoc).filter(Boolean);
  const maxCorr = db.documentos.reduce((m,d)=>Math.max(m, Number(d.correlativo)||0), 0);
  if(db.correlativo <= maxCorr) db.correlativo = maxCorr + 1;
  return db;
}

function normalizarDoc(d){
  if(!d || typeof d !== 'object') return null;
  const doc = {
    id: d.id || uid(),
    correlativo: Number(d.correlativo) || 0,
    codigo: str(d.codigo), titulo: str(d.titulo),
    disciplina: str(d.disciplina) || DISCIPLINAS[0],
    tipo: str(d.tipo) || TIPOS_DOC[0],
    fase: str(d.fase) || 'Detalle',
    area: str(d.area), emisor: str(d.emisor), enlace: str(d.enlace), enlaceDrive: str(d.enlaceDrive),
    formatos: Array.isArray(d.formatos) ? d.formatos.slice() : (d.formatos ? String(d.formatos).split(/[,;]\s*/) : []),
    estadoFinal: ESTADOS_FINALES.indexOf(d.estadoFinal) >= 0 ? d.estadoFinal : 'Vigente para construcción',
    observaciones: str(d.observaciones),
    terreno: Object.assign(
      { estado:'No verificado', rfiNumero:'', rfiEstado:'No aplica', ncr:'', discrepancias:[] },
      d.terreno || {}
    ),
    revisiones: Array.isArray(d.revisiones) ? d.revisiones.map(normalizarRev) : []
  };
  if(!Array.isArray(doc.terreno.discrepancias)) doc.terreno.discrepancias = [];
  doc.terreno.discrepancias = doc.terreno.discrepancias.map(function(x){
    return {
      id: x.id || uid(), descripcion: str(x.descripcion), fecha: str(x.fecha),
      responsable: str(x.responsable), referencia: str(x.referencia),
      impacto: Array.isArray(x.impacto) ? x.impacto : [], accion: str(x.accion) || 'Por definir',
      resuelta: !!x.resuelta
    };
  });
  if(!doc.revisiones.length) doc.revisiones = [ revVacia('A') ];
  return doc;
}

function normalizarRev(r){
  r = r || {};
  return {
    id: r.id || uid(),
    rev: str(r.rev) || 'A',
    fechaRecepcion: str(r.fechaRecepcion),
    transmittal: str(r.transmittal),
    motivo: str(r.motivo),
    incorporacion: INCORPORACION.indexOf(r.incorporacion) >= 0 ? r.incorporacion : 'No aplica',
    revisor: str(r.revisor),
    fechaInicioRevision: str(r.fechaInicioRevision),
    estado: ESTADOS_REV.some(function(e){return e.id===r.estado;}) ? r.estado : 'recibido',
    fechaRespuesta: str(r.fechaRespuesta),
    plazoDias: Number(r.plazoDias) > 0 ? Number(r.plazoDias) : 10,
    nComentarios: Number(r.nComentarios) || 0,
    archivo: str(r.archivo),
    comentarios: Array.isArray(r.comentarios) ? r.comentarios.map(function(c,i){
      return {
        id: c.id || uid(), n: Number(c.n) || (i+1), descripcion: str(c.descripcion),
        disciplina: str(c.disciplina), criticidad: CRITICIDADES.indexOf(c.criticidad)>=0 ? c.criticidad : 'Media',
        respuesta: str(c.respuesta),
        estado: EST_COMENTARIO.indexOf(c.estado)>=0 ? c.estado : 'Abierto',
        fechaCierre: str(c.fechaCierre)
      };
    }) : []
  };
}

function revVacia(rev){
  return {
    id: uid(), rev: rev || 'A', fechaRecepcion: hoyISO(), transmittal: '', motivo: '',
    incorporacion: 'No aplica', revisor: '', fechaInicioRevision: '', estado: 'recibido',
    fechaRespuesta: '', plazoDias: (DB && DB.params ? DB.params.plazoRevisionDias : 10),
    nComentarios: 0, comentarios: []
  };
}

/* ==================================================================
   ===============             UTILIDADES             ===============
   ================================================================== */

function str(v){ return v == null ? '' : String(v); }
function uid(){ return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function $(sel, ctx){ return (ctx||document).querySelector(sel); }
function $$(sel, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(sel)); }

function esc(s){
  return str(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
               .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function attr(s){ return esc(s); }

/* --- Fechas: se guardan en ISO (aaaa-mm-dd), se muestran dd-mm-aaaa --- */
function hoyISO(){
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}
function pad(n){ return (n<10?'0':'') + n; }
function fmtFecha(iso){
  if(!iso) return '—';
  const p = String(iso).split('-');
  if(p.length !== 3) return esc(iso);
  return p[2] + '-' + p[1] + '-' + p[0];
}
function fechaObj(iso){
  if(!iso) return null;
  const p = String(iso).split('-').map(Number);
  if(p.length !== 3 || !p[0]) return null;
  const d = new Date(p[0], p[1]-1, p[2]);
  return isNaN(d.getTime()) ? null : d;
}
function diasCorridos(desdeISO, hastaISO){
  const a = fechaObj(desdeISO), b = fechaObj(hastaISO);
  if(!a || !b) return null;
  return Math.round((b - a) / 86400000);
}
function diasHabiles(desdeISO, hastaISO){
  const a = fechaObj(desdeISO), b = fechaObj(hastaISO);
  if(!a || !b) return null;
  if(b < a) return -diasHabiles(hastaISO, desdeISO);
  let n = 0; const cur = new Date(a.getTime());
  while(cur < b){
    cur.setDate(cur.getDate()+1);
    const dw = cur.getDay();
    if(dw !== 0 && dw !== 6) n++;
  }
  return n;
}
function dias(desdeISO, hastaISO){
  return DB.params.usarDiasHabiles ? diasHabiles(desdeISO, hastaISO) : diasCorridos(desdeISO, hastaISO);
}
function mesEtiqueta(iso){
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const p = String(iso).split('-');
  if(p.length < 2) return '—';
  return M[Number(p[1])-1] + '-' + String(p[0]).slice(2);
}

/* --- Lógica de negocio sobre documentos --- */
function revActual(doc){ return doc.revisiones[doc.revisiones.length - 1]; }
function estadoInfo(id){
  for(let i=0;i<ESTADOS_REV.length;i++) if(ESTADOS_REV[i].id === id) return ESTADOS_REV[i];
  return ESTADOS_REV[0];
}
function nComentarios(rev){ return rev.comentarios.length || Number(rev.nComentarios) || 0; }
function comentariosAbiertos(doc){
  let n = 0;
  doc.revisiones.forEach(function(r){
    r.comentarios.forEach(function(c){ if(c.estado === 'Abierto' || c.estado === 'Respondido') n++; });
  });
  return n;
}
function altasAbiertas(doc){
  let n = 0;
  doc.revisiones.forEach(function(r){
    r.comentarios.forEach(function(c){
      if(c.criticidad === 'Alta' && (c.estado === 'Abierto' || c.estado === 'Respondido')) n++;
    });
  });
  return n;
}
/* Días en revisión de la revisión vigente */
function diasEnRevision(doc){
  const r = revActual(doc);
  if(!r.fechaRecepcion) return null;
  const hasta = r.fechaRespuesta || hoyISO();
  return dias(r.fechaRecepcion, hasta);
}
/* Semáforo de plazo: {cls, label, restante} */
function semaforo(doc){
  const r = revActual(doc);
  const usados = diasEnRevision(doc);
  if(usados == null) return { cls:'neutral', label:'Sin fecha', restante:null };
  const plazo = Number(r.plazoDias) || DB.params.plazoRevisionDias;
  const restante = plazo - usados;
  if(estadoInfo(r.estado).cerrado){
    return restante >= 0
      ? { cls:'ok',  label:'Cerrado en plazo ('+usados+' d)', restante:restante }
      : { cls:'bad', label:'Cerrado fuera de plazo ('+usados+' d)', restante:restante };
  }
  if(restante < 0)  return { cls:'bad',  label:'Vencido ('+Math.abs(restante)+' d)', restante:restante };
  if(restante <= 2) return { cls:'warn', label:'Por vencer ('+restante+' d)', restante:restante };
  return { cls:'ok', label:'En plazo ('+restante+' d)', restante:restante };
}
function estaVencido(doc){
  const s = semaforo(doc);
  return !estadoInfo(revActual(doc).estado).cerrado && s.restante != null && s.restante < 0;
}
function bloqueadoParaConstruccion(doc){ return altasAbiertas(doc) > 0; }

/* --- Interfaz: toast, descarga, modal --- */
function toast(msg, tipo, ms){
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + (tipo || '');
  el.innerHTML = msg;
  box.appendChild(el);
  setTimeout(function(){ el.remove(); }, ms || 4200);
}
function descargar(nombre, contenido, mime){
  /* Versión publicada en claude.ai: el visor entrega el archivo a través de la capacidad "downloads" */
  if(typeof window.claude === 'object' && window.claude && typeof window.claude.use === 'function'){
    window.claude.use('downloads').then(function(dl){
      if(!dl){ toast('La descarga no está disponible en esta vista. Use la copia local de la app para exportar.', 'bad', 6000); return; }
      return dl.save({ filename: nombre, data: contenido }).then(function(){ toast('Archivo guardado.', 'ok'); })
        .catch(function(e){ if(e && e.code !== 'declined') toast('No se pudo guardar el archivo (' + esc(e && e.code || '') + ').', 'bad'); });
    });
    return;
  }
  try{
    const blob = new Blob([contenido], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 500);
  }catch(e){ toast('No se pudo generar el archivo: ' + esc(e.message), 'bad'); }
}
function abrirModal(html, ancho){
  const root = document.getElementById('modalRoot');
  root.innerHTML = '<div class="overlay" id="ovl"><div class="modal ' + (ancho==='narrow'?'narrow':'') + '">' + html + '</div></div>';
  const ovl = document.getElementById('ovl');
  ovl.addEventListener('mousedown', function(ev){ if(ev.target === ovl) cerrarModal(); });
  document.addEventListener('keydown', escCierra);
  if(typeof aplicarModoLectura === 'function') aplicarModoLectura(root);
  const primero = root.querySelector('input,select,textarea,button');
  if(primero) primero.focus();
}
function cerrarModal(){
  document.getElementById('modalRoot').innerHTML = '';
  document.removeEventListener('keydown', escCierra);
}
function escCierra(ev){ if(ev.key === 'Escape') cerrarModal(); }
function confirmar(titulo, texto, onOk, textoBoton){
  abrirModal(
    '<div class="modal-head"><h2>' + esc(titulo) + '</h2><button class="x" onclick="cerrarModal()" aria-label="Cerrar">×</button></div>' +
    '<div class="modal-body">' + texto + '</div>' +
    '<div class="modal-foot"><button class="btn" onclick="cerrarModal()">Cancelar</button>' +
    '<button class="btn danger" id="btnOkConfirm">' + esc(textoBoton || 'Eliminar') + '</button></div>', 'narrow');
  document.getElementById('btnOkConfirm').onclick = function(){ cerrarModal(); onOk(); };
}
function ayuda(texto){
  return '<span class="hint" title="' + attr(texto.replace(/<[^>]+>/g,'')) + '">?</span>';
}
function pill(cls, label){
  return '<span class="pill ' + cls + '"><span class="dot"></span>' + esc(label) + '</span>';
}
function pillEstado(id){
  const e = estadoInfo(id);
  return '<span class="pill ' + e.cls + '"><span class="dot"></span>' + esc(e.label) + '</span>';
}
function opciones(lista, sel){
  return lista.map(function(v){
    return '<option value="' + attr(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>';
  }).join('');
}
function valorCampo(id){
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* --- Apertura de archivos: ruta relativa (misma carpeta) o URL --- */
function esURL(s){ return /^(https?:|file:)/i.test(str(s).trim()); }
function hrefArchivo(ruta){
  ruta = str(ruta).trim();
  if(!ruta) return '';
  if(esURL(ruta)) return ruta;
  /* ruta relativa: se codifica para que espacios y acentos funcionen en el navegador */
  return ruta.split('/').map(encodeURIComponent).join('/');
}
/* Enlace principal del documento: archivo de la revisión vigente, luego enlace general, luego Drive */
/* En la versión publicada en la web (no file://) las rutas relativas no existen:
   se usa primero el enlace de Google Drive, salvo que haya una carpeta conectada. */
const MODO_WEB = (typeof location !== 'undefined' && location.protocol !== 'file:');
function enlaceDoc(doc, rev){
  const r = rev || revActual(doc);
  const conectada = (typeof CARPETA !== 'undefined' && CARPETA.conectada);
  if(MODO_WEB && !conectada) return driveDe(r.archivo) || hrefArchivo(doc.enlaceDrive) || driveDe(doc.enlace) || (esURL(doc.enlace) ? hrefArchivo(doc.enlace) : '');
  return hrefArchivo(r.archivo) || hrefArchivo(doc.enlace) || hrefArchivo(doc.enlaceDrive) || driveDe(r.archivo);
}
function abrirDocumento(id, revId){
  const d = docPorId(id);
  if(!d) return;
  let r = null;
  if(revId) r = d.revisiones.filter(function(x){ return x.id === revId; })[0];
  /* 1) carpeta conectada: se lee el archivo directamente */
  if(clickDoc(null, id, revId) === false) return;
  /* 2) ruta relativa o URL */
  const h = enlaceDoc(d, r);
  if(!h){ toast('Este documento no tiene archivo ni enlace asociado. Edite la ficha y complete "Archivo PDF".', 'bad'); return; }
  window.open(h, '_blank', 'noopener');
}
function enlaceAbrir(doc, texto, cls){
  const h = enlaceDoc(doc);
  const enCarpeta = typeof entradaDe === 'function' && entradaDe(revActual(doc).archivo || doc.enlace);
  if(!h && !enCarpeta) return '<span class="' + (cls || '') + '" title="Sin archivo asociado">' + texto + '</span>';
  return '<a class="' + (cls || '') + ' doclink" href="' + attr(h || '#') + '" target="_blank" rel="noopener" ' +
         'onclick="return clickDoc(event,\'' + doc.id + '\')" title="Abrir el documento en una pestaña nueva">' + texto + '</a>';
}

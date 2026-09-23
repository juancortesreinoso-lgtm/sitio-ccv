/* ==================================================================
   ===============   DOCUMENTACIÓN BASE DEL CONTRATO   ==============
   ==================================================================
   Carga inicial con la ingeniería real recibida en la carpeta
   "Construccion" (documentos Innomotics del proyecto 66OP12040 /
   A23M400) y las Bases Técnicas de CODELCO alojadas en Google Drive.

   El campo `enlace` es la RUTA RELATIVA del PDF respecto de este
   archivo HTML: mientras la app viva en la misma carpeta que los
   planos (local, Google Drive para escritorio, pendrive), un clic
   en el código del documento lo abre directamente.
   `enlaceDrive` es opcional: URL del mismo archivo en Google Drive.

   Fechas de recepción: se cargan con la fecha de hoy y estado
   "Recibido"; ajústelas en la ficha de cada documento.
   ================================================================== */


function datosDeEjemplo(){ return documentacionBase(); }

function documentacionBase(){
  let n = 0;
  const AREA_RQ = '3200 Molienda SAG — Cambio Cicloconvertidor (03221)';
  const hoy = hoyISO();
  function doc(o){
    /* o.revs = [[rev, archivo, fechaEmision, nota], ...]  (la última es la vigente) */
    const revs = (o.revs || [['0', o.archivo || '', '', '']]).map(function(r, i, arr){
      const ultima = (i === arr.length - 1);
      return {
        rev: r[0], fechaRecepcion: hoy, transmittal: o.transmittal || 'Carpeta Construccion',
        motivo: (i === 0 ? 'Carga inicial desde carpeta Construccion' : 'Revisión posterior recibida') + (r[3] ? ' — ' + r[3] : '') + (r[2] ? ' (emisión ' + fmtFecha(r[2]) + ')' : ''),
        incorporacion: i === 0 ? 'No aplica' : 'Sí',
        revisor: '', fechaInicioRevision: '', estado: ultima ? 'recibido' : 'superado',
        fechaRespuesta: '', plazoDias: 10, nComentarios: 0, comentarios: [],
        archivo: r[1] || ''
      };
    });
    const vig = revs[revs.length - 1];
    return normalizarDoc({
      correlativo: ++n, codigo: o.codigo, titulo: o.titulo, disciplina: o.disciplina, tipo: o.tipo,
      fase: o.fase || 'Detalle', area: o.area || 'Sala Eléctrica Modular (E-House CCV)',
      emisor: o.emisor || EMISOR_INN, enlace: vig.archivo, enlaceDrive: o.drive || driveDe(vig.archivo),
      formatos: ['PDF'], estadoFinal: 'Vigente para construcción',
      observaciones: (o.obs || '') + (o.codInn ? (o.obs ? ' · ' : '') + 'Código Innomotics: ' + o.codInn : ''),
      revisiones: revs
    });
  }

  return [
    doc({ codigo:'BT-MONTAJE-CCV', titulo:'Bases Técnicas — Obras de Montaje Reemplazo de Cicloconvertidor Molino SAG (Rev 0, mayo 2026)',
      disciplina:'Multidisciplina', tipo:'Especificación técnica', fase:'Básica', area:'Contrato',
      emisor:'CODELCO División Andina (mandante)', transmittal:'Proceso de licitación',
      drive:'https://drive.google.com/file/d/1h3U6sM-8NPBxY9k0bmiuk6MqSL5Rm8gX/view',
      obs:'Documento contractual que define el alcance del servicio. Alojado en Google Drive (carpeta Cicloconvertidor).',
      revs:[['0','', '2026-05', '']] }),

    doc({ codigo:'4502319491-03221-202EL-00001', titulo:'Diagrama unilineal — Sistema de distribución MT (cicloconvertidor, excitación, motor anillo)',
      disciplina:'Eléctrica', tipo:'Diagrama unilineal', codInn:'66OP12040-INN-DAND-EL-PL0096',
      obs:'Base del módulo didáctico "Guía del Proyecto". Rev 0 PARA CONSTRUCCIÓN 15-08-2025.',
      revs:[['0','4502319491-03221-202EL-00001.pdf','2025-08-15','']] }),
    doc({ codigo:'4502319491-03221-202EL-0002', titulo:'Diagrama unilineal — Sistema de distribución BT (servicios auxiliares sala eléctrica)',
      disciplina:'Eléctrica', tipo:'Diagrama unilineal', codInn:'66OP12040-INN-DAND-EL-PL0097',
      revs:[['0','4502319491-03221-202EL-0002.pdf','','']] }),
    doc({ codigo:'4502319491-03221-402EL-00001', titulo:'Plano integración SSAA sala eléctrica (servicios auxiliares)',
      disciplina:'Eléctrica', tipo:'Plano', codInn:'66OP12040-INN-DAND-EL-PL0038',
      obs:'Aprobado para construcción 21-11-2025 (firmado digitalmente).',
      revs:[['0','4502319491-03221-402EL-00001.pdf','2025-11-21','']] }),
    doc({ codigo:'4502319491-03221-300EL-0001', titulo:'Detalle conexionado nuevos transductores LEM para punto estrella',
      disciplina:'Eléctrica', tipo:'Plano', area:'Motor anillo Molino SAG', codInn:'66OP12040-INN-DAND-EL-PL0042',
      revs:[['0','4502319491-03221-300EL-0001.pdf','','']] }),
    doc({ codigo:'4502319491-03221-300EL-0002', titulo:'Plano eléctrico 300EL-0002 (título por confirmar en carátula)',
      disciplina:'Eléctrica', tipo:'Plano', obs:'Título no legible automáticamente: confirmar en la carátula del PDF.',
      revs:[['0','4502319491-03221-300EL-0002.pdf','','']] }),
    doc({ codigo:'4502319491-03221-105EL-0002', titulo:'Layout equipo, pesos y dimensiones +1.U23 (gabinetes cicloconvertidor)',
      disciplina:'Eléctrica', tipo:'Layout', codInn:'66OP12040-INN-DAND-EL-PL0009',
      revs:[['B','4502319491-03221-105EL-0002 Rev B.pdf','2024-12-13','Para aprobación'],
            ['0','4502319491-03221-105EL-0002 Rev 0.pdf','','Emisión para construcción']] }),
    doc({ codigo:'4502319491-03221-401EL-00001', titulo:'+.B32 Cabinet dimension drawing — arrangement drawings',
      disciplina:'Eléctrica', tipo:'Layout', codInn:'CP-M0374-01-WM-AD',
      revs:[['R9','4502319491-03221-401EL-00001.pdf','','']] }),
    doc({ codigo:'4502319491-03221-401EL-00002', titulo:'+.B61 Cabinet dimension drawing — Layout y dimensiones gabinete de servidores',
      disciplina:'Instrumentación y Control', tipo:'Layout', codInn:'CP-M0374-01-WM-AD0061',
      revs:[['0','4502319491-03221-401EL-00002.pdf','2025-11-04','']] }),
    doc({ codigo:'4502319491-03221-106EL-00001', titulo:'Especificación de cables de fuerza, control y comunicación',
      disciplina:'Eléctrica', tipo:'Especificación técnica', codInn:'66OP12040-INN-DAND-EL-ET0084',
      obs:'Cables suministrados por CODELCO Andina (ver aportes DAND en Bases Técnicas).',
      revs:[['B','4502319491-03221-106EL-00001 Rev B.pdf','2025-05-26','']] }),
    doc({ codigo:'4502319491-03221-104ME-00001', titulo:'Detalle de montaje transductores de corriente (hoja del fabricante, título por confirmar)',
      disciplina:'Eléctrica', tipo:'Plano', area:'Motor anillo Molino SAG',
      revs:[['0','4502319491-03221-104ME-00001.pdf','','']] }),
    doc({ codigo:'4502319491-03221-413AT-00001', titulo:'Bus configuration & communication overview — General master communication overview',
      disciplina:'Instrumentación y Control', tipo:'Plano', codInn:'66OP12040-INN-DAND-AT-PL0057',
      obs:'Rev 0 PARA CONSTRUCCIÓN 03-09-2025.',
      revs:[['0','4502319491-03221-413AT-00001.pdf','2025-09-03','']] }),
    doc({ codigo:'4502319491-03221-LSTAT-00001', titulo:'Listado de partes y listado de repuestos (automatización)',
      disciplina:'Instrumentación y Control', tipo:'Lista de materiales',
      revs:[['0','4502319491-03221-LSTAT-00001_1.pdf','','']] }),
    doc({ codigo:'CP-M0374-01-WM-EAB101', titulo:'GMD Wiring Manual — SAG Mill Gearless Drive 12000 kW, modernization power part (EPLAN, 1.304 hojas)',
      disciplina:'Eléctrica', tipo:'Otro', obs:'Manual de cableado del accionamiento. Archivo de 92 MB.',
      revs:[['R9','CP-M0374-01-WM-EAB101.pdf','2025-08-01','']] }),

    doc({ codigo:'4502319491-03221-100ME-00001', titulo:'Plano layout y arquitectura sala eléctrica — Layout sala eléctrica 2° piso',
      disciplina:'Arquitectura', tipo:'Layout', codInn:'66OP12040-INN-DAND-ME-PL0020',
      obs:'Existen dos archivos (con y sin sufijo "Rev 0"); verificar cuál es el vigente.',
      revs:[['0','4502319491-03221-100ME-00001.pdf','','']] }),
    doc({ codigo:'4502319491-03221-100ME-00002', titulo:'Disposición y detalles de calado de piso, base y muro sala eléctrica',
      disciplina:'Arquitectura', tipo:'Plano',
      revs:[['0','4502319491-03221-100ME-00002.pdf','','']] }),
    doc({ codigo:'4502319491-03221-100ME-00003', titulo:'Disposición y montaje de equipos HVAC — ductería y soportes (21 láminas)',
      disciplina:'HVAC', tipo:'Plano', obs:'Rev 0 13-11-2025.',
      revs:[['0','4502319491-03221-100ME-00003.pdf','2025-11-13','']] }),
    doc({ codigo:'4502319491-03221-104ME-00002', titulo:'Detalles de pesos y anclajes gabinetes interior sala nueva de potencia — dimensiones generales',
      disciplina:'Mecánica', tipo:'Plano', codInn:'66OP12040-INN-DAND-ME-PL0044',
      obs:'El archivo tiene un dígito extra en el nombre (45002319491-…).',
      revs:[['0','45002319491-03221-104ME-00002.pdf','','']] }),
    doc({ codigo:'4502319491-03221-200ME-00003', titulo:'Plano armado sala eléctrica modular (47 láminas)',
      disciplina:'Estructuras', tipo:'Plano', codInn:'66OP12040-INN-DAND-ME-PL0104',
      obs:'Documento de referencia obligatoria del manual de montaje.',
      revs:[['B','4502319491-03221-200ME-00003 Rev B.pdf','','Para aprobación'],
            ['0','4502319491-03221-200ME-00003.pdf','','Emisión para construcción']] }),
    doc({ codigo:'4502319491-03221-400ME-00001', titulo:'Plano disposición puntos de anclaje y reacciones en exoesqueleto sala eléctrica',
      disciplina:'Estructuras', tipo:'Plano', codInn:'66OP12040-INN-DAND-ME-PL0022',
      revs:[['B','4502319491-03221-400ME-0001 Rev B.pdf','2025-08-12','Emitido para revisión'],
            ['0','4502319491-03221-400ME-00001.pdf','','']] }),
    doc({ codigo:'4502319491-03221-400ME-00002', titulo:'Plano pesos y centro de masa sala eléctrica',
      disciplina:'Estructuras', tipo:'Plano', codInn:'66OP12040-INN-DAND-ME-PL0029',
      obs:'Peso total sala armada 24.656 kg (12.000 × 4.360 × 3.378 mm).',
      revs:[['0','4502319491-03221-400ME-00002.pdf','','']] }),
    doc({ codigo:'4502319491-03221-500ME-0001', titulo:'Esquema de tratamiento superficial y pintura — sala eléctrica (armable) CCV',
      disciplina:'Mecánica', tipo:'Especificación técnica', codInn:'66OP12040-INN-DAND-ME-PL0035',
      revs:[['0','4502319491-03221-500ME-0001.pdf','2025-11-12','']] }),
    doc({ codigo:'4502319491-03221-ESPME-00001', titulo:'Especificación técnica sala eléctrica — metalmecánica sala eléctrica 2° piso CCV DAND',
      disciplina:'Mecánica', tipo:'Especificación técnica', codInn:'66OP12040-INN-DAND-ME-ET0026',
      obs:'Aprobado para construcción 21-11-2025.',
      revs:[['0','4502319491-03221-ESPME-00001.pdf','2025-11-20','']] }),
    doc({ codigo:'4502319491-03221-HDDME-00001', titulo:'Hoja de datos — metalmecánica sala eléctrica 2° piso CCV DAND',
      disciplina:'Mecánica', tipo:'Datasheet', codInn:'66OP12040-INN-DAND-ME-HD0025',
      obs:'Aprobado para construcción 29-08-2025.',
      revs:[['0','4502319491-03221-HDDME-00001.pdf','2025-08-29','']] }),
    doc({ codigo:'4502319491-03221-MDCME-00001', titulo:'Memoria de cálculo estructural sala eléctrica modular',
      disciplina:'Estructuras', tipo:'Memoria de cálculo', codInn:'66OP12040-INN-DAND-ME-MC0021',
      revs:[['2','4502319491-03221-MDCME-00001 Rev 2.pdf','2025-11-12','']] }),
    doc({ codigo:'4502319491-03221-MDCME-00002', titulo:'Memoria de cálculo de HVAC',
      disciplina:'HVAC', tipo:'Memoria de cálculo', codInn:'66OP12040-INN-DAND-ME-MC0034',
      revs:[['0','4502319491-03221-MDCME-00002.pdf','2025-10-29','']] }),
    doc({ codigo:'4502319491-03221-MNLME-0001', titulo:'Manual de montaje en terreno sala eléctrica modular',
      disciplina:'Mecánica', tipo:'Procedimiento', codInn:'66OP12040-INN-DAND-ME-MA0030',
      obs:'Procedimiento de armado del fabricante: rige el montaje de la E-House (BT 5.4).',
      revs:[['0','4502319491-03221-MNLME-0001.pdf','2025-12-12','']] }),
    doc({ codigo:'4502319491-03221-100EL-00001', titulo:'Disposición general sistema de detección y extinción de incendios sala eléctrica (planta, isométrico, detalles, diagrama)',
      disciplina:'Eléctrica', tipo:'Plano', area:'Sala Eléctrica Modular — red de incendio',
      revs:[['0','4502319491-03221-100EL-00001.pdf','','']] }),
    doc({ codigo:'4502319491-03221-CEREL-0003', titulo:'Informe DICTUC — asimilación resistencia al fuego F-120 de panel (Comercial Firenze)',
      disciplina:'Arquitectura', tipo:'Otro', emisor:'Innomotics / DICTUC',
      obs:'Respaldo del muro cortafuego y paneles de la sala.',
      revs:[['0','4502319491-03221-CEREL-0003.pdf','','']] }),
    doc({ codigo:'ANEXO5-4.001', titulo:'Listado de cables de fuerza, control y comunicación (copia Anexo 5 BT, ítem 4.001)',
      disciplina:'Eléctrica', tipo:'Lista de materiales', emisor:'CODELCO División Andina (Anexo 5 BT)',
      obs:'Archivo recibido en Drive con numeración del Anexo 5 de las Bases Técnicas. Verificar si duplica a 106EL-00001.',
      revs:[['0','LISTADO CABLES DE FUERZA, CONTROL Y COMUNICACIÓN_4.001.pdf','','']] }),
    doc({ codigo:'ANEXO5-5.001', titulo:'Bus configuration & communication overview (copia Anexo 5 BT, ítem 5.001)',
      disciplina:'Instrumentación y Control', tipo:'Plano', emisor:'CODELCO División Andina (Anexo 5 BT)',
      obs:'Verificar si duplica a 413AT-00001.',
      revs:[['0','BUS CONFIGURATION & COMMUNICATION OVERVIEW_5.001.pdf','','']] }),
    doc({ codigo:'ANEXO5-5.003', titulo:'Diagrama unilineal sistema de distribución BT (copia Anexo 5 BT, ítem 5.003)',
      disciplina:'Eléctrica', tipo:'Diagrama unilineal', emisor:'CODELCO División Andina (Anexo 5 BT)',
      obs:'Verificar si duplica a 202EL-0002.',
      revs:[['0','DIAGRAMA UNILINEAL SISTEMA DE DISTRIBUCIÓN BT_5.003.pdf','','']] }),

    /* ---- Ingeniería de terreno R&Q Ingeniería S.A. (contrato CODELCO 4600029647, ODS 028) ---- */
    doc({ codigo:'4600029647-028-03221-205EL-00001', titulo:'Plano de canalizaciones — Cambio cicloconvertidor (exoesqueleto y escalerillas, molienda SAG)',
      disciplina:'Eléctrica', tipo:'Plano', emisor:EMISOR_RQ, area:AREA_RQ, transmittal:'Ingeniería de terreno R&Q',
      obs:'Cotas referidas al plano 4600029647-028-03221-205ES-00001 (posición del exoesqueleto). Verificar en terreno antes del montaje. Proyectó O. Hermosilla / revisó R. Díaz / JP R. Arteaga.',
      revs:[['A','','2026-07-08','Emitido para revisión interna'], ['B','4600029647-028-03221-205EL-00001_B.pdf','2026-07-09','Emitido para revisión CODELCO']] }),
    doc({ codigo:'4600029647-028-03221-300CI-00001', titulo:'Plano situación existente — Planta de situación existente (escalerillas) EL. 2916.400',
      disciplina:'Civil', tipo:'Plano', emisor:EMISOR_RQ, area:AREA_RQ, transmittal:'Ingeniería de terreno R&Q',
      revs:[['A','','2026-07-20','Emitido para revisión interna'], ['B','','2026-07-20','Emitido para revisión cliente'], ['0','','2026-08-18','Emitido para revisión cliente'],
            ['1','4600029647-028-03221-300CI-00001_1.pdf','2026-08-25','Emitido para revisión cliente']] }),
    doc({ codigo:'4600029647-028-03221-300CI-00002', titulo:'Plano sala con exoesqueleto — Planta de emplazamiento e isométrico',
      disciplina:'Civil', tipo:'Plano', emisor:EMISOR_RQ, area:AREA_RQ, transmittal:'Ingeniería de terreno R&Q',
      obs:'Rev 1 emitida PARA CONSTRUCCIÓN (14-09-2026).',
      revs:[['A','','2026-07-14','Emitido para revisión interna'], ['B','','2026-07-14','Emitido para revisión cliente'], ['0','','2026-07-17','Emitido para revisión cliente'],
            ['1','4600029647-028-03221-300CI-00002_1.pdf','2026-09-14','Emitido para construcción']] }),
    doc({ codigo:'4600029647-028-03221-LSTEL-00002', titulo:'Listado de circuitos eléctricos por tramos exactos',
      disciplina:'Eléctrica', tipo:'Lista de materiales', emisor:EMISOR_RQ, area:AREA_RQ, transmittal:'Ingeniería de terreno R&Q',
      obs:'Portada con observaciones CODELCO: agregar N° y nombre exacto del API, respetar formato CODELCO, responder observaciones en documento de respuestas y en la revisión superior.',
      revs:[['A','','2026-07-14','Revisión interna'], ['B','4600029647-028-03221-LSTEL-00002_B.pdf','2026-07-15','Revisión CODELCO']] }),
    doc({ codigo:'4600029647-028-03221-LSTEL-00003', titulo:'Listado de canalizaciones eléctricas',
      disciplina:'Eléctrica', tipo:'Lista de materiales', emisor:EMISOR_RQ, area:AREA_RQ, transmittal:'Ingeniería de terreno R&Q',
      obs:'Aplican las mismas observaciones de la portada de LSTEL-00002.',
      revs:[['A','','2026-07-15','Revisión interna'], ['B','4600029647-028-03221-LSTEL-00003_B.pdf','2026-07-15','Revisión CODELCO']] }),
    doc({ codigo:'4600029647-028-03221-LSTEL-00004', titulo:'Listado de equipos eléctricos',
      disciplina:'Eléctrica', tipo:'Lista de materiales', emisor:EMISOR_RQ, area:AREA_RQ, transmittal:'Ingeniería de terreno R&Q',
      obs:'Portada con observaciones CODELCO (N° de API, formato CODELCO).',
      revs:[['A','','2026-07-13','Revisión interna'], ['B','4600029647-028-03221-LSTEL-00004_B.pdf','2026-07-15','Revisión CODELCO']] }),
    doc({ codigo:'4600029647-028-03221-LSTEL-00005', titulo:'Listado de tie-in eléctricos',
      disciplina:'Eléctrica', tipo:'Lista de materiales', emisor:EMISOR_RQ, area:AREA_RQ, transmittal:'Ingeniería de terreno R&Q',
      obs:'Portada con observación CODELCO reiterada: agregar el N° de API.',
      revs:[['A','','2026-07-14','Revisión interna'], ['B','4600029647-028-03221-LSTEL-00005_B.pdf','2026-07-20','Revisión CODELCO']] }),
    doc({ codigo:'4600029647-028-03221-INFEL-00010', titulo:'Informe — Verificar datos de malla a tierra',
      disciplina:'Eléctrica', tipo:'Otro', emisor:EMISOR_RQ, area:AREA_RQ, transmittal:'Ingeniería de terreno R&Q',
      obs:'Informe de ingeniería de terreno (7 páginas). Por R. Díaz / rev. J. Contreras / apr. R. Arteaga; CODELCO A. Sandoval.',
      revs:[['A','','2026-07-29','Revisión interna'], ['B','4600029647-028-03221-INFEL-00010_B.pdf','2026-07-30','Revisión CODELCO']] })
  ];
}

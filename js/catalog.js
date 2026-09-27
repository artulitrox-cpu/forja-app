/* Forja: catálogo de ejercicios y constantes base. Script clásico: comparte variables globales con el resto de js/*.js e index.html. */

/* ============ Datos base ============ */
const LEVELS={beg:'Principiante',int:'Intermedio',adv:'Avanzado'};
const GOALS={fat:'Perder grasa',hyp:'Ganar masa muscular',maint:'Mantenimiento y salud'};
const SEX={f:'Mujer',m:'Hombre'};
const EQUIP={gym:'Gimnasio completo',db:'Mancuernas en casa',body:'Solo peso corporal'};
const EQ_LABEL={bar:'Barra',db:'Mancuernas',cable:'Polea',machine:'Máquina',body:'Peso corporal'};
const ALLOW={gym:['bar','db','cable','machine','body'],db:['db','body'],body:['body']};
const SLOT_LABEL={chest_press:'press de pecho',incline_press:'pecho superior',shoulder_press:'press de hombro',lateral:'deltoide lateral',triceps:'tríceps',vertical_pull:'tirón vertical',horizontal_row:'remo',rear_delt:'deltoide posterior',biceps:'bíceps',squat:'sentadilla',hinge:'bisagra de cadera',lunge:'pierna unilateral',hamstring_curl:'isquiotibiales',calves:'gemelos',core:'core',chest_fly:'aperturas de pecho',quad_iso:'cuádriceps aislado',glute_iso:'glúteo aislado'};
const LOWER=new Set(['squat','hinge','lunge','hamstring_curl','calves']);
const RT={easy:'Fácil',ok:'Normal',hard:'Difícil'};

const EX=[];
function E(id,n,slot,eq,anim,m,s,d,t,o={}){EX.push({id,n,slot,eq,anim,m,s,d,t,iso:!!o.iso,time:!!o.time,spine:!!o.spine,impact:!!o.impact})}
// Pecho
E('bench_bb','Press de banca con barra','chest_press','bar','bench',['Pectoral'],['Tríceps','Deltoide anterior'],'Tumbado en el banco, baja la barra controlada hasta el esternón y empuja hasta extender los brazos.','Junta las escápulas, apoya bien los pies y lleva los codos a unos 45° del torso.');
E('bench_db','Press de banca con mancuernas','chest_press','db','bench',['Pectoral'],['Tríceps','Deltoide anterior'],'Con una mancuerna en cada mano, baja hasta notar estiramiento en el pecho y empuja juntándolas arriba.','Más recorrido que con barra: controla la bajada durante 2 segundos.');
E('chest_machine','Press de pecho en máquina','chest_press','machine','bench',['Pectoral'],['Tríceps'],'Sentado con la espalda apoyada, empuja las asas al frente hasta casi bloquear los codos.','Ajusta el asiento para que las asas queden a la altura del pecho medio.');
E('pushup','Flexiones','chest_press','body','pushup',['Pectoral'],['Tríceps','Deltoide anterior','Core'],'Manos algo más abiertas que los hombros. Baja el pecho casi al suelo con el cuerpo recto y empuja.','Aprieta glúteos y abdomen para que la cadera no se hunda.');
E('incline_db','Press inclinado con mancuernas','incline_press','db','bench',['Pectoral superior'],['Deltoide anterior','Tríceps'],'En banco a 30°, baja las mancuernas a los lados del pecho alto y empuja hacia arriba.','Un banco muy inclinado pasa el trabajo al hombro: con 30° basta.');
E('incline_bb','Press inclinado con barra','incline_press','bar','bench',['Pectoral superior'],['Deltoide anterior','Tríceps'],'En banco inclinado, baja la barra a la parte alta del pecho y empuja en línea recta.','Muñecas rectas y alineadas sobre los codos.');
E('incline_machine','Press inclinado en máquina','incline_press','machine','bench',['Pectoral superior'],['Deltoide anterior','Tríceps'],'Empuja las asas hacia arriba y al frente siguiendo la guía de la máquina.','Escápulas pegadas al respaldo en todo el recorrido.');
E('decline_pushup','Flexiones con pies elevados','incline_press','body','pushup',['Pectoral superior'],['Deltoide anterior','Tríceps'],'Flexión con los pies sobre un banco o cajón. Carga más la parte alta del pecho.','Cuanto más altos los pies, más difícil.');
// Hombro
E('ohp_bb','Press militar con barra','shoulder_press','bar','ohp',['Deltoide anterior'],['Tríceps','Deltoide lateral','Core'],'De pie, empuja la barra desde la clavícula hasta bloquear los brazos encima de la cabeza.','Aprieta glúteos y adelanta la cabeza cuando pase la barra.');
E('ohp_db','Press de hombro con mancuernas','shoulder_press','db','ohp',['Deltoide anterior'],['Tríceps','Deltoide lateral'],'Sentado o de pie, empuja las mancuernas desde la altura de las orejas hasta arriba.','No arquees la zona lumbar para ganar recorrido.');
E('arnold','Press Arnold','shoulder_press','db','ohp',['Deltoide anterior','Deltoide lateral'],['Tríceps'],'Empieza con las palmas hacia ti y gíralas hacia fuera mientras empujas hacia arriba.','Movimiento fluido, sin rebotar abajo.');
E('shoulder_machine','Press de hombro en máquina','shoulder_press','machine','ohp',['Deltoide anterior'],['Tríceps'],'Sentado, empuja las asas hacia arriba hasta casi bloquear los codos.','Asas a la altura de los hombros al empezar.');
E('pike','Flexiones pike','shoulder_press','body','pushup',['Deltoide anterior'],['Tríceps'],'Con la cadera alta en forma de V invertida, baja la cabeza hacia el suelo y empuja.','Cuanto más vertical el torso, más trabajo de hombro.');
E('lat_db','Elevaciones laterales con mancuernas','lateral','db','lateral',['Deltoide lateral'],['Trapecio'],'Sube las mancuernas hacia los lados hasta la altura de los hombros y baja despacio.','Codos algo flexionados: sube con el codo, no con la mano.',{iso:1});
E('lat_cable','Elevación lateral en polea','lateral','cable','lateral',['Deltoide lateral'],['Trapecio'],'Con la polea baja al lado contrario, eleva el brazo hasta la altura del hombro.','La polea mantiene la tensión abajo: no descanses entre repeticiones.',{iso:1});
E('lat_machine','Elevación lateral en máquina','lateral','machine','lateral',['Deltoide lateral'],[],'Sentado, empuja los rodillos hacia arriba con los brazos hasta la altura de los hombros.','Pausa de un segundo arriba.',{iso:1});
// Tríceps
E('pushdown','Extensión de tríceps en polea','triceps','cable','pushdown',['Tríceps'],[],'Con los codos pegados al cuerpo, extiende los antebrazos hacia abajo hasta bloquear.','Solo se mueven los antebrazos.',{iso:1});
E('skull','Press francés','triceps','bar','bench',['Tríceps'],[],'Tumbado, baja la barra hacia la frente flexionando solo los codos y extiende.','Codos apuntando al techo en todo el recorrido.',{iso:1});
E('oh_ext','Extensión sobre la cabeza con mancuerna','triceps','db','ohp',['Tríceps'],[],'Sujeta una mancuerna con ambas manos detrás de la cabeza y extiende los codos hacia arriba.','Codos cerca de la cabeza, sin abrirlos.',{iso:1});
E('bench_dip','Fondos en banco','triceps','body','pushdown',['Tríceps'],['Pectoral','Deltoide anterior'],'Manos en el borde de un banco detrás de ti. Baja la cadera flexionando los codos y sube.','Baja hasta 90° de codo con los hombros lejos de las orejas.',{iso:1});
// Espalda
E('pullup','Dominadas','vertical_pull','body','pull',['Dorsal ancho'],['Bíceps','Romboides'],'Colgado con agarre prono, sube hasta que la barbilla pase la barra y baja por completo.','Inicia el tirón bajando las escápulas.');
E('latpull','Jalón al pecho','vertical_pull','cable','pull',['Dorsal ancho'],['Bíceps','Romboides'],'Sentado, tira de la barra hasta la parte alta del pecho y vuelve controlando.','Pecho alto y sin balancearte hacia atrás.');
E('latpull_n','Jalón con agarre neutro','vertical_pull','cable','pull',['Dorsal ancho'],['Bíceps','Braquial'],'Con agarre de palmas enfrentadas, tira hacia el pecho llevando los codos hacia abajo.','Piensa en meter los codos en los bolsillos.');
E('assisted','Dominadas asistidas con banda','vertical_pull','body','pull',['Dorsal ancho'],['Bíceps'],'Una banda elástica bajo las rodillas o los pies te ayuda a completar el recorrido.','Pasa a bandas más finas cuando progreses.');
E('row_bb','Remo con barra','horizontal_row','bar','row',['Dorsal ancho','Romboides'],['Deltoide posterior','Bíceps','Lumbares'],'Inclinado con la espalda recta, tira de la barra hacia el ombligo y baja controlando.','Torso a unos 45° y columna neutra en todo momento.',{spine:1});
E('row_db','Remo con mancuerna a una mano','horizontal_row','db','row',['Dorsal ancho','Romboides'],['Bíceps','Deltoide posterior'],'Con una mano y una rodilla apoyadas en el banco, tira de la mancuerna hacia la cadera.','Lleva el codo hacia atrás, no hacia arriba.');
E('row_cable','Remo sentado en polea','horizontal_row','cable','facepull',['Dorsal ancho','Romboides'],['Bíceps','Deltoide posterior'],'Sentado, tira del agarre hacia el abdomen juntando las escápulas.','No uses impulso con el torso.');
E('inv_row','Remo invertido','horizontal_row','body','row',['Dorsal ancho','Romboides'],['Bíceps','Core'],'Bajo una barra o mesa firme, con el cuerpo recto, tira del pecho hacia ella.','Pies más adelantados, más difícil.');
E('facepull','Face pull','rear_delt','cable','facepull',['Deltoide posterior'],['Trapecio','Manguito rotador'],'Con la cuerda a la altura de la cara, tira hacia ti separando las manos a los lados de la cabeza.','Termina con los pulgares apuntando hacia atrás.',{iso:1});
E('rev_fly','Pájaros con mancuernas','rear_delt','db','row',['Deltoide posterior'],['Romboides'],'Inclinado hacia delante, abre los brazos a los lados con los codos semiflexionados.','Peso ligero y pausa arriba.',{iso:1});
E('rev_deck','Contractor inverso en máquina','rear_delt','machine','facepull',['Deltoide posterior'],['Romboides'],'Sentado frente a la máquina, abre los brazos hacia atrás en arco.','Brazos a la altura de los hombros.',{iso:1});
E('ytw','Y-T-W en el suelo','rear_delt','body','lateral',['Deltoide posterior'],['Trapecio','Romboides'],'Tumbado boca abajo, eleva los brazos formando las letras Y, T y W.','Movimiento lento, sin tensar el cuello.',{iso:1});
// Bíceps
E('curl_bb','Curl con barra','biceps','bar','curl',['Bíceps'],['Antebrazo'],'De pie, flexiona los codos subiendo la barra hasta el pecho sin mover los hombros.','Codos fijos a los costados.',{iso:1});
E('curl_db','Curl con mancuernas','biceps','db','curl',['Bíceps'],['Antebrazo'],'Sube las mancuernas girando la palma hacia arriba y baja en 2 segundos.','Sin balanceo del torso.',{iso:1});
E('hammer','Curl martillo','biceps','db','curl',['Bíceps','Braquial'],['Antebrazo'],'Con las palmas enfrentadas, flexiona los codos como si martillaras.','Muñeca neutra en todo el recorrido.',{iso:1});
E('curl_cable','Curl en polea','biceps','cable','curl',['Bíceps'],['Antebrazo'],'Frente a la polea baja, flexiona los codos llevando el agarre hacia el pecho.','Tensión constante: no bloquees abajo.',{iso:1});
E('chinup','Dominadas supinas','biceps','body','pull',['Bíceps','Dorsal ancho'],['Braquial'],'Palmas hacia ti y manos al ancho de hombros. Sube hasta pasar la barbilla.','Baja por completo en cada repetición.');
// Pierna
E('squat_bb','Sentadilla con barra','squat','bar','squat',['Cuádriceps','Glúteos'],['Aductores','Core'],'Con la barra sobre los trapecios, baja la cadera hasta que los muslos queden paralelos y sube.','Rodillas en la dirección de los pies y talones en el suelo.',{spine:1});
E('goblet','Sentadilla goblet','squat','db','squat',['Cuádriceps','Glúteos'],['Core'],'Sujeta una mancuerna frente al pecho y baja entre las piernas con el torso erguido.','Codos por dentro de las rodillas abajo.');
E('legpress','Prensa de piernas','squat','machine','squat',['Cuádriceps','Glúteos'],['Isquiotibiales'],'Empuja la plataforma con los pies al ancho de caderas sin bloquear las rodillas.','La zona lumbar no debe despegarse del respaldo.');
E('air_squat','Sentadilla con peso corporal','squat','body','squat',['Cuádriceps','Glúteos'],['Core'],'Brazos al frente, baja la cadera atrás y abajo hasta la paralela y sube.','Controla 3 segundos la bajada para hacerla más dura.');
E('rdl','Peso muerto rumano','hinge','bar','hinge',['Isquiotibiales','Glúteos'],['Lumbares'],'Con las rodillas semiflexionadas, lleva la cadera atrás bajando la barra pegada a las piernas.','Baja hasta notar estiramiento en los isquios, no hasta el suelo.',{spine:1});
E('deadlift','Peso muerto convencional','hinge','bar','hinge',['Glúteos','Isquiotibiales','Lumbares'],['Trapecio','Antebrazo'],'Desde el suelo, empuja con las piernas y extiende la cadera con la barra pegada al cuerpo.','Espalda neutra: la barra sube vertical sobre el medio del pie.',{spine:1});
E('rdl_db','Peso muerto rumano con mancuernas','hinge','db','hinge',['Isquiotibiales','Glúteos'],['Lumbares'],'Con una mancuerna en cada mano, lleva la cadera atrás deslizándolas por los muslos.','Mira al suelo unos metros delante.');
E('hip_thrust','Hip thrust','hinge','bar','hinge',['Glúteos'],['Isquiotibiales'],'Con la espalda alta apoyada en un banco, empuja la cadera arriba con la barra sobre ella.','Barbilla recogida y pausa arriba.');
E('glute_bridge','Puente de glúteo','hinge','body','crunch',['Glúteos'],['Isquiotibiales'],'Tumbado boca arriba, eleva la cadera apretando los glúteos y baja controlando.','Empuja con los talones.');
E('sl_rdl','Peso muerto a una pierna','hinge','body','hinge',['Isquiotibiales','Glúteos'],['Core'],'Sobre una pierna, inclina el torso y lleva la otra pierna atrás en línea recta.','Cadera cuadrada hacia el suelo.');
E('bulgarian','Sentadilla búlgara','lunge','db','lunge',['Cuádriceps','Glúteos'],['Aductores'],'Con el pie trasero sobre un banco, baja la rodilla trasera hacia el suelo y sube.','Torso algo inclinado para más glúteo.');
E('lunge_db','Zancadas con mancuernas','lunge','db','lunge',['Cuádriceps','Glúteos'],['Isquiotibiales'],'Da un paso largo al frente y baja hasta que ambas rodillas formen 90°.','Rodilla delantera alineada con el pie.');
E('stepup','Step-up al cajón','lunge','db','lunge',['Cuádriceps','Glúteos'],[],'Sube a un cajón empujando con la pierna de arriba y baja controlando.','No te impulses con el pie de abajo.');
E('lunge_body','Zancadas alternas','lunge','body','lunge',['Cuádriceps','Glúteos'],['Isquiotibiales'],'Alterna zancadas al frente con el torso erguido.','Paso largo para más glúteo, corto para más cuádriceps.');
E('legcurl_lying','Curl femoral tumbado','hamstring_curl','machine','legcurl',['Isquiotibiales'],['Gemelos'],'Boca abajo, flexiona las rodillas llevando el rodillo hacia los glúteos.','Cadera pegada al banco.',{iso:1});
E('legcurl_seated','Curl femoral sentado','hamstring_curl','machine','legcurl',['Isquiotibiales'],[],'Sentado, lleva el rodillo hacia abajo y atrás flexionando las rodillas.','Pausa al final del recorrido.',{iso:1});
E('db_legcurl','Curl femoral con mancuerna','hamstring_curl','db','legcurl',['Isquiotibiales'],[],'Boca abajo con una mancuerna entre los pies, flexiona las rodillas.','Peso ligero y control.',{iso:1});
E('nordic','Curl nórdico','hamstring_curl','body','legcurl',['Isquiotibiales'],[],'De rodillas con los tobillos sujetos, déjate caer al frente lo más lento posible.','Frena con los isquios; apóyate con las manos al final.',{iso:1});
E('calf_stand','Elevación de talones de pie','calves','machine','calf',['Gemelos'],['Sóleo'],'Sube sobre las puntas lo más alto posible y baja hasta estirar.','Pausa de un segundo arriba y abajo.',{iso:1});
E('calf_seated','Elevación de talones sentado','calves','machine','calf',['Sóleo'],['Gemelos'],'Sentado con peso sobre las rodillas, eleva los talones.','Recorrido completo.',{iso:1});
E('calf_db','Elevación de talones con mancuerna','calves','db','calf',['Gemelos'],['Sóleo'],'Con una mancuerna en la mano y la punta en un escalón, eleva el talón.','Una pierna cada vez.',{iso:1});
E('calf_body','Elevación de talones a una pierna','calves','body','calf',['Gemelos'],['Sóleo'],'Sobre un escalón con una pierna, sube y baja el talón.','Apóyate en la pared solo para equilibrio.',{iso:1});
// Core
E('plank','Plancha','core','body','plank',['Abdomen'],['Oblicuos','Glúteos'],'Apoyado en antebrazos y puntas, mantén el cuerpo recto de cabeza a talones.','Aprieta glúteos y lleva el ombligo hacia la columna.',{iso:1,time:1});
E('cable_crunch','Crunch en polea','core','cable','crunch',['Abdomen'],[],'De rodillas frente a la polea alta, flexiona el tronco llevando los codos a los muslos.','Mueve la columna, no la cadera.',{iso:1});
E('hanging_raise','Elevación de piernas colgado','core','body','crunch',['Abdomen'],['Flexores de cadera'],'Colgado de una barra, sube las rodillas o las piernas hacia el pecho.','Sin balanceo.',{iso:1});
E('deadbug','Dead bug','core','body','crunch',['Abdomen'],['Oblicuos'],'Boca arriba, extiende brazo y pierna contrarios sin despegar la lumbar del suelo.','Exhala al extender.',{iso:1});
/* ---- Máquinas y poleas de gimnasio completo ---- */
// Pecho
E('smith_bench','Press de banca en multipower','chest_press','machine','bench',['Pectoral'],['Tríceps','Deltoide anterior'],'Tumbado bajo la barra guiada, desengancha girando las muñecas, baja al pecho medio y empuja.','Coloca el banco para que la barra baje justo sobre el esternón.');
E('smith_incline','Press inclinado en multipower','incline_press','machine','bench',['Pectoral superior'],['Deltoide anterior','Tríceps'],'Banco a 30° bajo la barra guiada. Baja a la parte alta del pecho y empuja.','Escápulas juntas y pies firmes en el suelo.');
E('pec_deck','Contractor de pecho (pec deck)','chest_fly','machine','bench',['Pectoral'],['Deltoide anterior'],'Sentado, junta los brazos al frente en arco hasta que las asas casi se toquen y abre controlando.','Codos ligeramente flexionados y fijos: el movimiento sale del hombro.',{iso:1});
E('cable_fly','Cruce de poleas','chest_fly','cable','facepull',['Pectoral'],['Deltoide anterior'],'Entre dos poleas altas, da un paso al frente y junta las manos delante del pecho en arco.','Pecho alto y un ligero giro de muñecas al juntar.',{iso:1});
E('db_fly','Aperturas con mancuernas','chest_fly','db','bench',['Pectoral'],['Deltoide anterior'],'Tumbado, abre los brazos en arco hasta notar estiramiento y vuelve a juntarlos arriba.','No bajes más allá de la línea de los hombros.',{iso:1});
// Espalda
E('chest_row','Remo con apoyo en el pecho','horizontal_row','machine','row',['Dorsal ancho','Romboides'],['Deltoide posterior','Bíceps'],'Con el pecho apoyado en el respaldo, tira de las asas hacia la cintura y aprieta las escápulas.','El apoyo protege la zona lumbar: no despegues el pecho.');
E('row_machine','Remo sentado en máquina','horizontal_row','machine','row',['Dorsal ancho','Romboides'],['Bíceps','Deltoide posterior'],'Sentado, tira de las asas hacia el abdomen llevando los codos atrás.','Espalda recta y pausa de un segundo con las escápulas juntas.');
E('tbar','Remo T','horizontal_row','bar','row',['Dorsal ancho','Romboides'],['Lumbares','Bíceps','Deltoide posterior'],'Inclinado sobre la barra anclada, tira del agarre hacia el pecho bajo.','Espalda neutra y rodillas semiflexionadas en todo momento.',{spine:1});
E('latpull_single','Jalón unilateral en polea','vertical_pull','cable','pull',['Dorsal ancho'],['Bíceps','Romboides'],'Con un agarre de una mano en la polea alta, tira hacia el costado llevando el codo a la cadera.','Deja que el hombro suba arriba para estirar el dorsal.');
E('assist_machine','Dominadas asistidas en máquina','vertical_pull','machine','pull',['Dorsal ancho'],['Bíceps','Romboides'],'De rodillas en la plataforma, sube hasta pasar la barbilla por la barra. Más contrapeso = más ayuda.','Baja controlando hasta estirar los brazos del todo.');
E('back_ext','Extensiones lumbares en banco','hinge','body','hinge',['Lumbares','Glúteos'],['Isquiotibiales'],'En el banco de hiperextensiones, baja el torso con la espalda recta y sube hasta alinear el cuerpo.','No hiperextiendas arriba: termina con el cuerpo recto.');
E('pull_through','Pull-through en polea','hinge','cable','hinge',['Glúteos','Isquiotibiales'],['Lumbares'],'De espaldas a la polea baja con la cuerda entre las piernas, lleva la cadera atrás y empuja al frente.','Es una bisagra: la espalda no se redondea.');
E('hip_thrust_machine','Hip thrust en máquina','hinge','machine','hinge',['Glúteos'],['Isquiotibiales'],'Con la espalda alta apoyada y el rodillo sobre la cadera, empuja hacia arriba hasta alinear tronco y muslos.','Mentón al pecho y pausa arriba apretando glúteos.');
// Brazos
E('preacher','Curl predicador en máquina','biceps','machine','curl',['Bíceps'],['Braquial'],'Con los brazos apoyados en el atril, flexiona los codos y baja hasta casi extender.','No despegues los codos del apoyo.',{iso:1});
E('dip_machine','Fondos en máquina','triceps','machine','pushdown',['Tríceps'],['Pectoral','Deltoide anterior'],'Sentado, empuja las asas hacia abajo hasta extender los codos.','Codos pegados al cuerpo y hombros abajo.',{iso:1});
E('rope_oh','Extensión de tríceps sobre la cabeza en polea','triceps','cable','ohp',['Tríceps'],[],'De espaldas a la polea con la cuerda detrás de la cabeza, extiende los codos al frente y arriba.','Codos fijos apuntando al frente.',{iso:1});
// Pierna
E('smith_squat','Sentadilla en multipower','squat','machine','squat',['Cuádriceps','Glúteos'],['Aductores'],'Con la barra guiada en los trapecios y los pies algo adelantados, baja hasta muslos paralelos y sube.','Rodillas en la línea de los pies.');
E('hack','Sentadilla hack','squat','machine','squat',['Cuádriceps','Glúteos'],['Aductores'],'Con la espalda apoyada en el respaldo y los hombros bajo las almohadillas, baja controlando y empuja.','Pies a la anchura de caderas en mitad de la plataforma.');
E('leg_ext','Extensión de cuádriceps','quad_iso','machine','legcurl',['Cuádriceps'],[],'Sentado con el rodillo sobre los tobillos, extiende las rodillas y baja en 2 segundos.','Ajusta el respaldo para que la rodilla quede alineada con el eje de la máquina.',{iso:1});
E('wall_sit','Sentadilla isométrica en pared','quad_iso','body','squat',['Cuádriceps'],['Glúteos'],'Espalda contra la pared y muslos paralelos al suelo. Mantén la posición.','Rodillas sobre los tobillos, no por delante.',{iso:1,time:1});
E('abductor','Abductor en máquina','glute_iso','machine','lateral',['Glúteos'],[],'Sentado, abre las piernas contra las almohadillas y cierra controlando.','Inclínate un poco al frente para cargar más el glúteo.',{iso:1});
E('glute_kick','Patada de glúteo en máquina','glute_iso','machine','hinge',['Glúteos'],['Isquiotibiales'],'Con el torso apoyado, empuja la plataforma hacia atrás extendiendo la cadera.','No arquees la zona lumbar al final.',{iso:1});
E('cable_kick','Patada de glúteo en polea','glute_iso','cable','hinge',['Glúteos'],['Isquiotibiales'],'Con la tobillera en la polea baja, lleva la pierna atrás y arriba extendiendo la cadera.','Torso quieto y abdomen firme.',{iso:1});
E('sl_bridge','Puente de glúteo a una pierna','glute_iso','body','crunch',['Glúteos'],['Isquiotibiales'],'Tumbado boca arriba con una pierna estirada, eleva la cadera empujando con el otro talón.','La cadera sube recta, sin girar.',{iso:1});
// Core
E('crunch_machine','Crunch en máquina','core','machine','crunch',['Abdomen'],[],'Sentado con los pies fijos, flexiona el tronco hacia las rodillas y vuelve controlando.','Exhala al bajar y no tires con los brazos.',{iso:1});
E('woodchop','Leñador en polea','core','cable','facepull',['Oblicuos'],['Abdomen'],'De lado a la polea alta, lleva el agarre en diagonal hasta la cadera contraria girando el tronco.','Los brazos casi rectos: el giro sale del tronco.',{iso:1});
const EXM=Object.fromEntries(EX.map(e=>[e.id,e]));
const X=id=>EXM[id];

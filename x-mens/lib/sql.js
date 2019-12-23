function define(name, value) {
	Object.defineProperty(exports, name, {
		value: value,
		enumerable: true,
		writable: false,
		configurable:false
	});
}

define('SET_HISTORIC',
	"INSERT IGNORE INTO historic(data_in, status, date_in) VALUES(?,?,now())");

define('GET_TRACKING_UC',
	"SELECT tr.id, tr.info, ca.code, ca.multilang_strings, co.name \
	  FROM (tracking tr INNER JOIN categories ca ON ca.id = tr.activity_id) \
	 									 INNER JOIN control_units co ON co.id = tr.control_unit_id \
   WHERE co.id = $1 \
	 	 AND tr.status = 1");

define('FIND_PROJECTS',
	"SELECT p.id, p.name, p.info,  bt.lista_cuc, bt.lista_area, bt.lista_uc, bt.lista_responsable, bt.lista_partidas, bt.tracking, bt.lista_days_of_week as days_of_week, p.is_lastplanner \
	FROM projects p, bi_tracking_snapshot bt \
		WHERE p.is_active = TRUE \
		AND p.id = bt.id_project \
		AND p.id::TEXT = ANY(SELECT jsonb_array_elements_text($1))");

define('FIND_PROJECTS_SC',
	"WITH partidas AS (SELECT json_agg(json_build_object( 'partidas',code, 'multilang',  multilang_strings)) as lista_partidas, project_id FROM categories \
											WHERE $2 LIKE concat('%',id::TEXT, '%') \
											GROUP BY project_id), \
				trackings as (WITH deptos_tr as (SELECT * FROM control_units WHERE project_id::TEXT = ANY(SELECT jsonb_array_elements_text($1))), \
														partidas_tr as (SELECT * FROM categories WHERE $1::TEXT LIKE concat('%',SUBSTRING(project_id::TEXT, 2, LENGTH(project_id::TEXT) - 2)::TEXT, '%') AND table_name = 'ACTIVITY'), \
														cuc_tr as (SELECT * FROM categories WHERE $1::TEXT LIKE concat('%',SUBSTRING(project_id::TEXT, 2, LENGTH(project_id::TEXT) - 2)::TEXT, '%') AND table_name = 'CUC') \
											SELECT json_agg(json_build_object( 'ID',tr.id, 'cuc', ctr.multilang_strings, 'code', ptr.code, 'info', tr.info, 'name', dtr.name, 'id_resp', tr.responsible_id, 'multilang', ptr.multilang_strings)) as lista_tracking, ptr.project_id \
												FROM tracking tr, partidas_tr ptr, cuc_tr ctr, deptos_tr dtr \
												WHERE $2 LIKE concat('%',tr.activity_id, '%') \
													AND tr.control_unit_id = dtr.id \
													AND tr.status = 1 \
													AND dtr.control_unit_type_id = ctr.id \
													AND tr.activity_id = ptr.id \
												GROUP BY ptr.project_id) \
		SELECT p.id, p.name, p.info,  bt.lista_cuc, bt.lista_area, bt.lista_uc, pa.lista_partidas, tr.lista_tracking as tracking, bt.lista_days_of_week as days_of_week, p.is_lastplanner \
		FROM projects p, bi_tracking_snapshot bt, partidas pa, trackings tr \
		WHERE p.is_active = TRUE \
		AND p.id = bt.id_project \
		AND p.id = ANY(pa.project_id) \
		AND p.id = ANY(tr.project_id) \
		AND p.id::TEXT = ANY(SELECT jsonb_array_elements_text($1))");

define('PROJECT_GET_STATUS',
		'WITH partidas AS (SELECT json_agg(json_build_object( \'partidas\',code, \'multilang\',  multilang_strings)) as lista_partidas, project_id FROM categories \
		WHERE $1 = ANY(project_id) \
		AND table_name = \'ACTIVITY\' \
		AND code NOT IN (select (c2.info->>\'parent\') as parent \
							from categories c2 \
							where c2.table_name = \'ACTIVITY\' \
							and c2.info->>\'parent\' != \'\' \
							and $1  = ANY(c2.project_id)) \
		GROUP BY project_id), \
		trackings as (WITH deptos_tr as (SELECT * FROM control_units WHERE project_id = $1 ORDER BY "order"::INT), \
									partidas_tr as (SELECT * FROM categories WHERE $1 = ANY(project_id) AND table_name = \'ACTIVITY\' \
									AND code NOT IN (select (c2.info->>\'parent\') as parent \
																from categories c2 \
																where c2.table_name = \'ACTIVITY\' \
																and c2.info->>\'parent\' != \'\' \
																and $1  = ANY(c2.project_id)) \
													ORDER BY CODE::INT ), \
									cuc_tr as (SELECT * FROM categories WHERE $1::TEXT LIKE concat(\'%\',SUBSTRING(project_id::TEXT, 2, LENGTH(project_id::TEXT) - 2)::TEXT, \'%\') AND table_name = \'CUC\') \
									SELECT json_agg(json_build_object( \'ID\',tr.id, \'cuc\', ctr.multilang_strings, \'code\', ptr.code, \'info\', tr.info, \'name\', dtr.name, \'id_resp\', tr.responsible_id, \'multilang\', ptr.multilang_strings)) as lista_tracking, ptr.project_id \
									FROM deptos_tr dtr, partidas_tr ptr, cuc_tr ctr, tracking tr \
									WHERE tr.control_unit_id = dtr.id \
									AND tr.status = 1 \
									AND dtr.control_unit_type_id = ctr.id \
									AND tr.activity_id = ptr.id \
									GROUP BY ptr.project_id), \
		responsables as (WITH id_responsable as (select id from profiles where type = \'RESPONSABLE_PROFILE\' LIMIT 1) \
						SELECT json_agg(json_build_object( \'ID_RESP\', u.id, \'NAME\', u.name, \'LAST_NAME\', u.last_name))  as lista_responsable \
								FROM users u, companies c, id_responsable ir \
								WHERE is_deleted = FALSE \
								AND ir.id = ANY(u.profiles) \
								AND u.company_id = c.id \
								AND (u.properties->ir.id::TEXT->>\'projects_r\' LIKE $2 OR u.properties->ir.id::TEXT->>\'projects\' LIKE $2)) \
		SELECT p.id, p.name, p.info,  bt.lista_cuc, bt.lista_area, bt.lista_uc, pa.lista_partidas, tr.lista_tracking as tracking, bt.lista_days_of_week as days_of_week, re.lista_responsable, p.is_lastplanner \
		FROM projects p, bi_tracking_snapshot bt, partidas pa, trackings tr, responsables re \
		WHERE p.is_active = TRUE \
		AND p.id = bt.id_project \
		AND p.id = ANY(pa.project_id) \
		AND p.id = ANY(tr.project_id) \
		AND p.id = $1');

define('DEVICES_GET_BY_EMAIL',
	" SELECT (SELECT name::TEXT \
		FROM profiles  \
	   WHERE id = p.id) as profile_name, \
	p.type as profile_type,u.id AS id, u.name, u.last_name, u.is_active AS user_is_active, u.properties, u.secure, u.audit, \
	c.id AS company_id, c.name AS company_name, c.is_active AS company_is_active, p.id AS profile_id, c.bcolor_logo \
	FROM users u, companies c, profiles p \
	WHERE c.id = u.company_id  \
	AND u.is_deleted = FALSE  \
	AND (p.type = 'MOBILE_TERRENO_PROFILE' \
	AND UPPER(u.properties->(p.id)::TEXT->>'email') = UPPER($1)) \
	OR (p.type = 'RESPONSABLE_PROFILE' \
	AND UPPER(u.properties->(p.id)::TEXT->>'email') = UPPER($1)) \
	OR (p.type = 'MOBILE_SCONTRACTOR_PROFILE' \
	AND UPPER(u.properties->(p.id)::TEXT->>'email') = UPPER($1)) \
	ORDER BY p.type ASC \
	LIMIT 1");

define('FIRST_REGISTER_MOBILE',
	 "UPDATE users \
		SET name = $2, \
				last_name = $3, \
		    properties = $4, \
				audit = $5 \
		WHERE id = $1");

define('GET_PLANIFICATION_OP',
		"SELECT fechaini, fechafin, code_partida, multilang_partida, name_responsable, last_name_responsable, cant_uc, uc FROM bi_planning_app_snapshot \
		WHERE project_id = $1");

define('GET_ID_PARTIDA',
		"SELECT id FROM categories \
		WHERE $1 = ANY(project_id) \
		AND table_name = 'ACTIVITY' \
		AND TRIM(multilang_strings->'es'->>'name') = TRIM($2)");

define("INSERT_RESTRICTION",
		"INSERT INTO restrictions(id, project_id, id_partida, name_partida, status, id_responsable, name_responsable, restriccion, date_in, date_close_comp, is_active, enable_mobile) \
		VALUES($1, $2, $3, $4, 0, $5, $6, $7, now()::TIMESTAMP, $8, TRUE, FALSE)");

define("GET_STATUS_RESTRICTION",
		"SELECT id, project_id, name_partida, date_close_comp, enable_mobile FROM restrictions \
		WHERE id = ANY($1)");

define('GET_PLANIFICATION',
	"WITH fechaIniP AS (SELECT date::date FROM planification WHERE planification_type = 1 AND project_id = $1 ORDER BY date DESC LIMIT 1), \
	fechaFinP AS (SELECT end_date::date FROM planification WHERE planification_type = 1 AND project_id = $1 ORDER BY end_date DESC LIMIT 1) \
	SELECT fi.date as fechaIni, \
				ff.end_date as fechaFin, \
				ca.code as code_partida, \
				ca.multilang_strings as multilang_partida, \
				(SELECT us.name FROM users us WHERE us.id = trP.responsible_id) as name_responsable, \
				(SELECT us.last_name FROM users us WHERE us.id = trP.responsible_id) as last_name_responsable, \
				count(co.name) as cant_uc, \
				json_agg(json_build_object('name', co.name, 'day_of_week', ge.values::JSON->pl.day_of_week::TEXT, 'id', trA.id, 'info', trA.info, 'key_cuc', ca.code,'multilang_cuc',ca.multilang_strings)) as uc \
	FROM planification pl, fechaIniP fi, fechaFinP ff, tracking trP, tracking trA, categories ca, control_units co, general_tables ge \
	WHERE pl.project_id = $1 \
	AND pl.planification_type = 1 \
	AND fi.date <= pl.date \
	AND pl.date <= ff.end_date \
	AND pl.tracking_id = trP.id \
	AND trP.activity_id = ca.id \
	AND trP.control_unit_id = co.id \
	AND trA.status = 1 \
	AND trA.control_unit_id = co.id \
	AND trA.activity_id = ca.id \
	AND ge.code = 'day_of_week' \
	AND ca.code NOT IN (select (c2.info->>'parent') as parent \
						from categories c2 \
						where c2.table_name = 'ACTIVITY' \
						and c2.info->>'parent' != '' \
						and pl.project_id  = ANY(c2.project_id)) \
	GROUP BY ca.id, ca.code,  pl.day_of_week, ca.multilang_strings, name_responsable, last_name_responsable,  fi.date, ff.end_date, ge.values \
	ORDER BY ca.code::INT, name_responsable,  pl.day_of_week");

define('GET_PLANIFICATION_RES',
	"WITH fechaIniP AS (SELECT date::date FROM planification WHERE planification_type = 1 AND project_id = $1 ORDER BY date DESC LIMIT 1), \
	fechaFinP AS (SELECT end_date::date FROM planification WHERE planification_type = 1 AND project_id = $1 ORDER BY end_date DESC LIMIT 1) \
	SELECT fi.date as fechaIni, \
				ff.end_date as fechaFin, \
				ca.code as code_partida, \
				ca.multilang_strings as multilang_partida, \
				(SELECT us.name FROM users us WHERE us.id = trP.responsible_id) as name_responsable, \
				(SELECT us.last_name FROM users us WHERE us.id = trP.responsible_id) as last_name_responsable, \
				count(co.name) as cant_uc, \
				json_agg(json_build_object('name', co.name, 'day_of_week', ge.values::JSON->pl.day_of_week::TEXT,'key_cuc', ca.code,'multilang_cuc',ca.multilang_strings)) as uc \
	FROM planification pl, fechaIniP fi, fechaFinP ff, tracking trP, categories ca, control_units co, general_tables ge \
	WHERE pl.project_id = $1 \
	AND pl.planification_type = 1 \
	AND fi.date <= pl.date \
	AND pl.date <= ff.end_date \
	AND pl.tracking_id = trP.id \
	AND trP.activity_id = ca.id \
	AND trP.control_unit_id = co.id \
	AND ge.code = 'day_of_week' \
	AND ca.code NOT IN (select (c2.info->>'parent') as parent \
						from categories c2 \
						where c2.table_name = 'ACTIVITY' \
						and c2.info->>'parent' != '' \
						and pl.project_id  = ANY(c2.project_id)) \
	GROUP BY ca.id, ca.code,  pl.day_of_week, ca.multilang_strings, name_responsable, last_name_responsable,  fi.date, ff.end_date, ge.values \
	ORDER BY ca.code::INT, name_responsable,  pl.day_of_week");


define('UPDATE_TRACKING',
			"UPDATE tracking \
			    SET status = 0 \
			  WHERE activity_id = $1  \
					AND control_unit_id = $2 \
					AND status = 1");

define('GET_DATA_INSERT_TRACKING',
				"SELECT activity_id, control_unit_id, responsible_id, info \
					FROM tracking \
				 WHERE 	id = $1");

define('INSERT_TRACKING',
			"INSERT INTO tracking(id, status, info, updated_on, updated_by, activity_id, control_unit_id, responsible_id) \
						VALUES (uuid_generate_v4(), 1, $1, current_timestamp, $2, $3, $4, $5)");



						
 define('USER_GET_BY_MAIL',
 "WITH mtp_profile_id AS (SELECT id::TEXT, type \
                            FROM profiles \
                           WHERE type = 'MOBILE_TERRENO_PROFILE') \
  SELECT u.id AS id, u.name, u.last_name, u.is_active AS user_is_active, u.properties, u.secure, u.audit, \
         c.id AS company_id, c.name AS company_name, c.is_active AS company_is_active, c.bcolor_logo \
         CASE \
              WHEN u.properties->(SELECT id FROM mtp_profile_id)::TEXT->>'email' IS NULL \
                   THEN (SELECT id FROM mtp_profile_id) \
                   ELSE (SELECT id FROM mtp_profile_id) \
         END AS profile_id \
   FROM users u, companies c \
  WHERE c.id = u.company_id \
      AND u.is_deleted = FALSE \
      AND (u.properties->(SELECT id FROM mtp_profile_id)::TEXT->>'email' = $1)");

define('USER_GET_BY_MAIL_AND_CODE',
"WITH mtp_profile_id AS (SELECT id::TEXT, type \
						 						 FROM profiles \
												 WHERE type = 'MOBILE_TERRENO_PROFILE') \
 SELECT (SELECT name::TEXT  \
         FROM profiles \
        WHERE type = $3) as profile_name, \
	$3 as profile_type, u.id AS id, u.name, u.last_name, u.is_active AS user_is_active, u.properties, u.secure, u.audit, \
	c.id AS company_id, c.name AS company_name, c.is_active AS company_is_active, c.bcolor_logo \
				CASE \
						 WHEN u.properties->(SELECT id FROM mtp_profile_id)::TEXT->>'email' IS NULL \
									THEN (SELECT id FROM mtp_profile_id) \
									ELSE (SELECT id FROM mtp_profile_id) \
				END AS profile_id \
  FROM users u, companies c \
 WHERE c.id = u.company_id \
     AND u.is_deleted = FALSE \
     AND (u.properties->(SELECT id FROM mtp_profile_id)::TEXT->>'email' = $1) \
     AND (u.secure->(SELECT id FROM mtp_profile_id)::TEXT->>'google_code' = $2)");

define('IMAGE_GET',
			'SELECT c.info FROM companies c\
				WHERE c.id = $1\
				AND c.info IS NOT NULL');


define('USER_GOOGLE_INIT',
    "UPDATE users \
        SET name = $2, \
       last_name = $3, \
      properties = $4, \
          secure = $5, \
           audit = $6 \
        WHERE id = $1");

define('GET_PROJECT_SNAPSHOT',
    "SELECT bp.date_id, bp.scheduled_progress, bp.real_progress, bp.scheduled_ending_date, bp.real_ending_date, \
       			bp.area_id, bp.project_id FROM bi_project_snapshot bp \
			WHERE bp.project_id = $1 AND \
			      bp.area_id = $2 \
			ORDER BY bp.date_id DESC \
			LIMIT 1");

define('GET_WEEKLY_SNAPSHOT',
		"SELECT bw.id, bw.scheduled_progress, bw.real_progress, bw.area_id, bw.project_id, bw.periodo_real_ini, bw.periodo_real_fin \
			 FROM bi_weekly_snapshot bw \
			WHERE bw.project_id = $1 AND \
		        bw.area_id = $2\
			ORDER BY bw.date_id DESC \
		  LIMIT 1")

/***************************/
define('DEVICES_GET_BY_PHONE_AND_HASH',
	 "WITH profile_id as (SELECT id::TEXT \
                          FROM profiles \
                         WHERE type = $3) \
	SELECT u.id AS id, u.name, u.last_name, u.is_active AS user_is_active, u.properties, u.secure, u.audit, \
         c.id AS company_id, c.bcolor_logo, c.name AS company_name, c.is_active AS company_is_active, (SELECT id \
												 																																  FROM profile_id) AS profile_id \
     FROM users u, companies c \
    WHERE c.id = u.company_id \
      AND u.is_deleted = FALSE \
      AND u.secure->(SELECT id \
											 FROM profile_id)::TEXT->>'hash' = $1 \
      AND u.properties->(SELECT id \
												   FROM profile_id)::TEXT->>'phone' = $2");

define('USERS_FIND_BY_MT',
	"	SELECT u.id AS id, u.name, u.last_name, u.is_active AS user_is_active, u.properties, u.secure, u.audit, \
	c.id AS company_id, c.bcolor_logo, c.name AS company_name, c.is_active AS company_is_active, \
	p.id AS profile_id \
FROM users u, companies c, profiles p \
WHERE c.id = u.company_id \
 AND u.is_deleted = FALSE \
	   AND (p.type = 'MOBILE_TERRENO_PROFILE' \
				AND u.secure->(p.id)::TEXT->>'token' = $1) \
	   OR (p.type = 'RESPONSABLE_PROFILE' \
				AND u.secure->(p.id)::TEXT->>'token' = $1) \
		 OR (p.type = 'MOBILE_SCONTRACTOR_PROFILE' \
				AND u.secure->(p.id)::TEXT->>'token' = $1) \
	   AND u.is_deleted = FALSE \
ORDER BY p.type ASC \
LIMIT 1");

define('SALES_FIND',
	"SELECT *, to_char(available_date AT TIME ZONE 'UTC' AT TIME ZONE 'CLST', 'YYYY-MM') AS month \
       FROM sales s \
       LEFT JOIN users u ON s.user_id = u.id \
      WHERE (u.parent_id = $1 OR u.id = $1) \
        AND values->'6' IS NOT NULL \
        AND to_char(available_date AT TIME ZONE 'UTC' AT TIME ZONE 'CLST', 'YYYY-MM') = $2");

define('SALES_CREATE',
	'INSERT INTO sales (id, type, values, geospatial_data, available_date, user_id) \
   VALUES (uuid_generate_v4(), $1, $2::JSON, $3::JSON, now(), $4) \
   RETURNING id');

define('INSERT_NOTIFICATION_RESTRICCION',
   "INSERT INTO process_notification(id, name, date_in, values) \
   							VALUES(uuid_generate_v4(), $1, now(), $2)");

define('SALES_DELETE',
	'DELETE FROM sales WHERE id = $1');

define('CHAT_CREATE',
	'INSERT INTO chat_rooms (id, name, created_on, created_by, participants) \
   VALUES (uuid_generate_v4(), $1, now(), $2, $3::UUID[]) \
   RETURNING id');

define('CHAT_FIND_BY_BOTH_USERS',
	'SELECT id, name, participants \
	   FROM chat_rooms \
	  WHERE array_length(participants, 1) = 2 \
		AND $1 = any(participants) \
		AND $2 = any(participants) \
	  LIMIT 1');

define('CHAT_FIND_BY_USER',
	"SELECT cr.id, cr.participants, \
            CASE \
                 WHEN (cr.name) = '' THEN \
                      (SELECT name || ' ' || last_name AS name FROM users \
                        WHERE id <> $1 \
                          AND id = ANY (cr.participants) \
                      ) \
                 ELSE (cr.name) \
            END AS name \
       FROM chat_rooms cr \
      WHERE $1 = any(cr.participants)");

define('CHAT_FIND',
	'SELECT id, name, participants \
		 FROM chat_rooms \
		WHERE id = $1');

define('CHAT_UPDATE',
	'UPDATE chat_rooms \
      SET name = $1 \
      WHERE id = $2');

define('CHAT_MESSAGES_FIND',
	'SELECT ucr.id AS message_id, ucr.message, ucr.date, u.id AS user_id, u.name, u.last_name \
		 FROM user_chat_room ucr, users u \
		WHERE chat_room_id = $1 \
			AND date < to_timestamp($2) \
			AND u.id = ucr.user_id \
		ORDER BY date DESC \
		LIMIT 10');

define('USER_CHAT_CREATE',
	'INSERT INTO user_chat_room (id, date, message, user_id, chat_room_id) \
   VALUES (uuid_generate_v4(), now(), $1, $2, $3) \
   RETURNING id');

define('FIND_TEAM_GOALS',
    "WITH profile_id AS (SELECT id::TEXT \
                           FROM profiles \
                          WHERE type = 'MOBILE_PROFILE'), \
          month_id AS (SELECT month_id \
                         FROM goals \
                        ORDER BY month_id DESC \
                        LIMIT 1) \
   SELECT u.id AS user_id, u.name, u.last_name, go.id AS goals_id, go.goals, (SELECT month_id FROM month_id) AS month_id \
     FROM users u \
     LEFT JOIN goals go ON go.user_id = u.id \
    WHERE (u.parent_id = $1 OR u.id = $1) \
      AND go.month_id IN (SELECT month_id FROM month_id) \
    ORDER BY u.last_name ASC, u.name ASC");

define('GOALS_FIND_BY_USER',
     "SELECT * \
        FROM goals \
       INNER JOIN users ON goals.user_id = users.id \
       WHERE goals.id = $1");

define('GOALS_DELETE',
     'DELETE FROM goals \
            WHERE id = $1');

define('GOALS_CREATE',
     'INSERT INTO goals \
        (id,  month_id, goals, supervisor_id, user_id) \
        VALUES (uuid_generate_v4(), $1, $2::JSON, $3, $4) \
        RETURNING id,  month_id, goals, supervisor_id, user_id');

define('GOALS_UPDATE',
    "UPDATE goals \
        SET month_id = $2, goals = $3::JSON \
         WHERE id = $1 \
         RETURNING id, month_id, goals");

define('GOALS_FIND_BY_MONTH_USER',
	'SELECT goals \
		 FROM goals \
		WHERE month_id = $1 \
	    AND user_id = $2');

define('DASHBOARD_FIND_BY_MONTH_USER',
	'SELECT SUM(dtd_mobile_products_sold + hfs_mobile_products_sold) AS mobile_sales, \
					SUM(dtd_home_products_sold + hfs_home_products_sold) AS home_sales, \
					SUM(dtd_approached_doors) AS approached_doors, SUM(dtd_knocked_doors) AS knocked_doors, \
					SUM(dtd_home_evaluated_customers + dtd_mobile_evaluated_customers + hfs_home_evaluated_customers + hfs_mobile_evaluated_customers) AS evaluated_customers \
		 FROM bi_users_monthly_snapshot \
		WHERE month_id = $1 \
	    AND user_id IN (SELECT id \
	                      FROM users \
	                     WHERE (user_id = $2 OR parent_id = $2))');

define('GOALS_FIND_BY_MONTH_TEAM',
	'SELECT goals \
		 FROM goals \
		WHERE month_id = $1 \
	    AND user_id = $2');

define('DASHBOARD_FIND_BY_MONTH_TEAM',
	'SELECT SUM(dtd_mobile_products_sold + hfs_mobile_products_sold) AS mobile_sales, \
	        SUM(dtd_home_products_sold + hfs_home_products_sold) AS home_sales \
		 FROM bi_users_monthly_snapshot \
		WHERE month_id = $1 \
	    AND user_id IN (SELECT id \
	                      FROM users \
	                     WHERE (user_id = $2 OR parent_id = $2 OR user_id = $3 OR parent_id = $3))');

define('USER_STATUS',
	"WITH profile_id as (SELECT id::TEXT \
												 FROM profiles \
												WHERE type = 'MOBILE_PROFILE') \
 SELECT u.id, u.name, u.last_name, count(s.*) AS sent_today, u.properties->(SELECT id FROM profile_id)::TEXT->>'phone' AS phone, \
				CASE u.audit->(SELECT id FROM profile_id)::TEXT->>'last_login' WHEN '' THEN '' ELSE ((u.audit->(SELECT id FROM profile_id)::TEXT->>'last_login')::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'CLST')::DATE::TEXT END AS last_login \
	 FROM users u LEFT OUTER JOIN sales s ON s.user_id = u.id AND (s.available_date AT TIME ZONE 'UTC' AT TIME ZONE 'CLST')::DATE = (now() AT TIME ZONE 'UTC' AT TIME ZONE 'CLST')::DATE \
	WHERE u.parent_id = $1 \
	GROUP by 1, 2, 3, 5, 6");

define('CHAT_ROOM_USERS',
	"WITH profile_id as (SELECT id::TEXT \
												 FROM profiles \
												WHERE type = 'MOBILE_PROFILE') \
	SELECT id, name, last_name \
		 FROM users \
		WHERE (parent_id = $1 OR id = $1 OR parent_id = $2 OR id = $2) \
			AND (properties->(SELECT id FROM profile_id)::TEXT->>'type' = 'SUPERVISOR' OR properties->(SELECT id FROM profile_id)::TEXT->>'type' = 'USER')");

define('USER_PUSH_REGISTER',
	"UPDATE users \
 			SET properties = $2 \
 		WHERE id = $1");



define('FORM_MASTERS_FIND_ALL',
		'SELECT * \
			 FROM form_masters \
			WHERE is_active = TRUE \
			ORDER BY forder');

define('USERS_UPDATE_LOGIN_ATTEMPTS',
		'UPDATE users \
			SET audit = $2 \
		  WHERE id = $1');

define('USERS_UPDATE_LOGIN',
		'UPDATE users \
    		SET secure = $2, \
        		audit = $3 \
  		  WHERE id = $1');

define('MASTER_QUEUE_GET_TASKS',
		"SELECT * \
			 FROM (SELECT qc.id AS qc_id, qc.name AS qc_name, qc.purge_cycle AS qc_purge_cycle, qc.use_images AS qc_use_images, qm.id AS qm_id, 'Ruta ' || ro.code AS qm_name, ro.is_synced, to_char(now() AT TIME ZONE 'EDT', 'YYYY-MM-DD HH24:MI:SS') AS server_time, ro.process_date, ro.id, \
										(SELECT array_to_json(array_agg(row_to_json(t))) \
											 FROM (SELECT ro1.code::TEXT AS route, t.id, ro1.available_to, p.address1, p.address2, p.code AS customer_id, p.name, p.taxid, COALESCE(p.lat, 0) as lat, COALESCE(p.lon, 0) as lon, p.access_pin, c.name AS city_name, co.name AS country_name, t.priority, t.comments, t.stop, t.arrival_datetime, t.offload_rate, t.frozen_quantity, t.cool_quantity, t.dry_quantity, t.packages_out, \
											              LPAD(extract(hour from t.arrival_datetime)::text, 2, '0') || ':' || LPAD(extract(minute from t.arrival_datetime)::text, 2, '0') AS arrival_time, \
											              t.arrival_datetime::DATE || ' ' || LPAD(extract(hour from t.arrival_datetime)::text, 2, '0') || ':' || LPAD(extract(minute from t.arrival_datetime)::text, 2, '0') AS arrival_datetime_str, \
																		(SELECT array_to_json(array_agg(row_to_json(o))) \
																			 FROM (SELECT o.invoice_number, o.quantity, r.sku, r.name AS product_name, rc.name AS product_category, rc.code AS category_type \
																							 FROM orders o, resources r, resource_categories rc \
																							WHERE o.task_id = t.id \
																								AND r.id = o.resource_id \
																								AND rc.id = r.resource_category_id \
																								AND r.is_active = TRUE \
																							ORDER BY 5, 4) o \
																		) AS orders, \
																		(SELECT array_to_json(array_agg(row_to_json(fu))) \
																			 FROM (SELECT fu.form_master_id \
																							 FROM form_users fu, form_masters fm \
																							WHERE fu.task_id = t.id \
																								AND fu.is_available = FALSE \
																								AND fm.id = fu.form_master_id \
																							ORDER BY fm.forder) fu \
																		) AS forms \
															 FROM routes ro1, tasks t, places p, cities c, countries co, form_users fu1, form_masters fm \
															WHERE ro1.id = ro.id \
																AND ro1.is_active = TRUE \
																AND now() AT TIME ZONE 'UTC' AT TIME ZONE 'EDT' BETWEEN ro1.available_from AND ro1.available_to \
																AND ro1.is_available = TRUE \
																AND t.route_id = ro1.id \
																AND p.id = t.place_id \
																AND p.is_active = TRUE \
																AND c.id = p.city_id \
																AND co.id = c.country_id \
																AND fu1.task_id = t.id \
																AND fu1.is_available = FALSE \
																AND fm.id = fu1.form_master_id \
																AND fm.identifier = 'manifest' \
																AND c.is_active = TRUE \
																AND ro1.queue_master_id = qm.id \
																AND NOT EXISTS (SELECT * \
																									FROM form_users fu99, form_masters fm99 \
																								 WHERE fm99.identifier = 'rejection' \
																									 AND fm99.id = fu99.form_master_id \
																									 AND fu99.task_id = t.id \
																									 AND fu99.is_available = TRUE) \
																								 ORDER BY 11) t \
										) AS tasks \
							 FROM queue_categories qc, queue_masters qm, routes ro \
							WHERE ro.queue_master_id = qm.id \
								AND ro.user_id = $1 \
								AND qm.is_active = TRUE \
								AND qc.id = qm.queue_category_id \
								AND qc.is_active = TRUE \
								AND ro.is_active = TRUE \
								AND ro.is_available = TRUE \
								AND now() AT TIME ZONE 'UTC' AT TIME ZONE 'EDT' BETWEEN ro.available_from AND ro.available_to \
								AND ro.is_available = TRUE \
							GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 \
						) rec");

define('TASKS_UPDATE_SYNCED',
		'UPDATE routes \
				SET is_synced = TRUE, \
						delivered_on = now() \
			WHERE user_id = $1 \
			  AND is_active = TRUE \
				AND now() BETWEEN available_from AND available_to \
				AND is_available = TRUE');

define("USERS_FIND_BY_ID",
		"SELECT u.id AS user_id, u.name, u.last_name, u.is_active AS user_is_active, u.properties, u.secure, u.audit, \
            pro.id AS profile_id, c.id AS company_id, c.bcolor_logo, c.name AS company_name, c.is_active AS company_is_active, pro.privileges \
       FROM users u, companies c, profiles pro, privileges pri \
      WHERE c.id = u.company_id \
        AND u.is_deleted = FALSE \
        AND pro.id = ANY(u.profiles) \
        AND pri.code IN (SELECT json_object_keys(pro1.privileges) AS o \
                           FROM profiles pro1 \
                          WHERE pro1.id = pro.id) \
        AND EXISTS (SELECT * \
                      FROM general_tables gt \
                     WHERE gt.code = 'PRIVILEGE_TYPES' \
                       AND gt.values->pri.type::TEXT->>'code' = $2) \
        AND u.id = $111 \
      LIMIT 1");

define('FORM_USERS_GET_VALUES',
		'SELECT fm.id, fm.identifier, fu.values, EXTRACT(EPOCH FROM fu.user_sent_date) * 1000 AS user_sent_date \
		   FROM form_users fu, form_masters fm \
		 	WHERE fm.id = fu.form_master_id \
		   	AND fu.task_id = $1 \
		 	ORDER BY fm.forder');

define('FORM_USERS_UPDATE',
		'UPDATE form_users \
        SET filled_date = $3::TIMESTAMP, \
						filled_lat = $4, \
						filled_lon = $5, \
						filled_gps_accuracy = $6, \
						sent_date = $7::TIMESTAMP, \
						sent_lat = $8, \
						sent_lon = $9, \
						sent_gps_accuracy = $10, \
						values = $11, \
						is_available = TRUE, \
						first_validation_date = $12::TIMESTAMP, \
						first_validation_lat = $13, \
						first_validation_lon = $14, \
						first_validation_gps_accuracy = $15, \
						first_view_date = $16::TIMESTAMP, \
						first_view_lat = $17, \
						first_view_lon = $18, \
						first_view_gps_accuracy = $19, \
						notification_sent = FALSE, \
						available_date = now(), \
						user_sent_date = $20::TIMESTAMP, \
						user_sent_lat = $21, \
						user_sent_lon = $22, \
						user_sent_gps_accuracy = $23 \
		  WHERE task_id = $1 \
        AND form_master_id = $2 \
  RETURNING id');

define('FORM_USERS_CREATE',
		'INSERT INTO form_users (id, form_master_id, filled_date, filled_lat, filled_lon, filled_gps_accuracy, sent_date, sent_lat, sent_lon, sent_gps_accuracy, values, is_available, first_validation_date, first_validation_lat, first_validation_lon, first_validation_gps_accuracy, first_view_date, first_view_lat, first_view_lon, first_view_gps_accuracy, notification_sent, available_date, user_id, user_sent_date, user_sent_lat, user_sent_lon, user_sent_gps_accuracy) \
		 VALUES (uuid_generate_v4(), $1, $2::TIMESTAMP, $3, $4, $5, $6::TIMESTAMP, $7, $8, $9, $10, TRUE, $11::TIMESTAMP, $12, $13, $14, $15::TIMESTAMP, $16, $17, $18, FALSE, now(), $19, $20, $21, $22, $23) RETURNING id');

define('DEVICES_PAIR',
		'UPDATE users \
        SET secure = $2, \
            properties = $3, \
            is_active = $4 \
      WHERE id = $1');

define('DEVICES_NEW_HASH',
		'UPDATE users \
        SET secure = $2, \
            properties = $3, \
            is_active = false \
      WHERE id = $1');

define('TASKS_AUTOASSIGN',
		'UPDATE tasks \
				SET user_id = $2 \
			 FROM orders o, queue_masters qm \
			WHERE o.number = $1 \
				AND tasks.id = o.task_id \
				AND qm.id = tasks.queue_master_id \
				AND qm.is_autoassign = FALSE');

define('FIND_GENERAL_TABLES',
		"SELECT * \
			 FROM general_tables \
			WHERE code IN ($1)");

define('NOTIFY_PUSH_MESSAGE', "NOTIFY push_message, '$1'");

define('QUEUE_MASTERS_EVENTS_REGISTER',
		'INSERT INTO queue_masters_info (id, process_date, event_date, queue_master_id, type, data) \
		 VALUES (uuid_generate_v4(), $1, to_timestamp($2), (SELECT queue_master_id FROM routes WHERE user_id = $3 AND process_date = $1 LIMIT 1), $4, $5)');

define('MASTER_QUEUE_GET_DATA',
		"SELECT data \
			 FROM queue_masters_info \
			WHERE type = 'ld' \
				AND process_date = $1 \
				AND queue_master_id = $2");

define('RESOURCES_FIND_ALL',
		"SELECT r.id, r.sku, r.name AS product_name, rc.code AS category_type, rc.name AS category_name \
			 FROM resources r, resource_categories rc \
			WHERE r.is_active = TRUE \
				AND rc.id = r.resource_category_id \
				AND rc.code = 'E' \
			ORDER BY 3");

define('GENERAL_TABLES_FIND_CLIENT_VALUES',
	"SELECT code, name, values \
     FROM general_tables \
    WHERE is_active = TRUE \
      AND code in ('APP_SALES_DATA', 'APP_CONTACT_PHONE', 'APP_CITIES')");

define('FIND_USER_TIPS',
	"SELECT t.id, t.type, t.code, t.title, t.icon, t.body \
	   FROM tips t \
	  WHERE t.is_active = TRUE");

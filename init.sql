use brs_crawler;

--CREATE USER 'utils_crawler'@'localhost' IDENTIFIED BY 'utils_crawler';
--GRANT ALL PRIVILEGES ON utils_crawler.* TO 'utils_crawler'@'localhost';

-- ssl_checks table
CREATE TABLE IF NOT EXISTS ssl_checks (
	ssl_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	peer_id INT UNSIGNED NOT NULL,
	ssl_status INT UNSIGNED NULL,
	ssl_from TIMESTAMP NULL,
	ssl_to TIMESTAMP NULL,
	last_scanned TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
  CONSTRAINT ssl_checks_pk PRIMARY KEY (ssl_id),
  CONSTRAINT ssl_checks_peer_id_uk UNIQUE KEY (peer_id)
)
AUTO_INCREMENT=1
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_general_ci;


-- loc_checks table
CREATE TABLE IF NOT EXISTS loc_checks (
	loc_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	country_city VARCHAR(191) NOT NULL,
  CONSTRAINT loc_checks_pk PRIMARY KEY (loc_id),
  CONSTRAINT loc_checks_city_uk UNIQUE KEY (country_city)
)
AUTO_INCREMENT=1
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_general_ci;


-- checks table
CREATE TABLE IF NOT EXISTS checks (
		id INT UNSIGNED NOT NULL AUTO_INCREMENT,
		peer_id INT UNSIGNED NOT NULL,
		blocked SMALLINT UNSIGNED DEFAULT 0 NOT NULL,
		ip VARCHAR(45) DEFAULT NULL,
		loc_id INT UNSIGNED DEFAULT NULL,
		ssl_id INT UNSIGNED DEFAULT NULL,
		api INT UNSIGNED DEFAULT NULL,
		last_scanned TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
	CONSTRAINT checks_pk PRIMARY KEY (id),
	CONSTRAINT checks_peer_id_uk UNIQUE KEY (peer_id)
)
AUTO_INCREMENT=1
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_general_ci;

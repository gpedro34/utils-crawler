use brs_crawler;

--CREATE USER 'utils_crawler'@'localhost' IDENTIFIED BY 'utils_crawler';
--GRANT ALL PRIVILEGES ON utils_crawler.* TO 'utils_crawler'@'localhost';

-- checks table
CREATE TABLE IF NOT EXISTS checks (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  peer_id INT UNSIGNED NOT NULL,
	blocked SMALLINT UNSIGNED DEFAULT 0 NOT NULL,
	ip VARCHAR(45) NULL,
	city VARCHAR(45) NULL,
	country VARCHAR(5) NULL,
	region VARCHAR(45) NULL,
  lat FLOAT(7,4) NULL,
  lon FLOAT(7,4) NULL,
  ssl_id INT UNSIGNED NULL,
  is_public INT UNSIGNED NULL,
  api INT UNSIGNED NULL,
	last_scanned TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
  CONSTRAINT checks_pk PRIMARY KEY (id),
	CONSTRAINT checks_peer_id_uk UNIQUE KEY (peer_id)
)
AUTO_INCREMENT=1
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_general_ci;

-- ssl_checks table
CREATE TABLE IF NOT EXISTS ssl_checks (
  ssl_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  peer_id INT UNSIGNED NOT NULL,
  ssl_status INT UNSIGNED NULL,
  ssl_from TIMESTAMP NULL,
  ssl_to TIMESTAMP NULL,
	last_scanned TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
  CONSTRAINT ssl_checks_pk PRIMARY KEY (ssl_id),
  CONSTRAINT checks_peer_id_uk UNIQUE KEY (peer_id)
)
AUTO_INCREMENT=1
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_general_ci;

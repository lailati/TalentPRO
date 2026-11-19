-- =====================================================================
-- TalentPro: skema pangkalan data (skop tesis PSM I: Admin dan Pensyarah)
-- Sasaran: MySQL 8 dan MariaDB 10.4+ (XAMPP). Aksara utf8mb4.
-- Sepuluh jadual = storan data D1-D10 dalam DFD dan kamus data Bab 4
-- (Jadual 4.3 hingga Jadual 4.12). Nama jadual dan medan tidak boleh
-- diubah tanpa mengemas kini Bab 4.
--
-- PENTING: sql_mode XAMPP lalai tidak ketat, jadi nilai ENUM yang salah
-- (contoh role 'hr') disimpan sebagai kosong tanpa ralat. Aplikasi PHP mesti
-- menetapkan SET SESSION sql_mode = 'STRICT_ALL_TABLES' selepas sambung,
-- atau tambah sql_mode dalam C:\xampp\mysql\bin\my.ini.
--
-- Selamat dijalankan berulang kali: guna CREATE ... IF NOT EXISTS.
-- Skrip ini TIDAK memadam data. Untuk set semula, lihat bahagian
-- "SET SEMULA" di hujung fail (dikomen).
--
-- Jalankan (XAMPP, tanpa kata laluan root pada komputer tempatan):
--   C:\xampp\mysql\bin\mysql.exe -u root < docs\talentpro_mysql.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `talentpro`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `talentpro`;

-- ---------------------------------------------------------------------
-- D1 users: akaun pengguna (peranan admin atau lecturer)
-- Nota: password_hash muat cincangan bcrypt daripada password_hash() PHP
-- (60 aksara). Lajur salt dikekalkan mengikut kamus data; bcrypt telah
-- membenamkan garam, jadi lajur ini boleh diisi rentetan rawak.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            VARCHAR(40)  NOT NULL,
  `username`      VARCHAR(60)  NOT NULL,
  `email`         VARCHAR(120) NOT NULL,
  `full_name`     VARCHAR(120) NOT NULL,
  `role`          ENUM('admin','lecturer') NOT NULL,
  `department`    VARCHAR(80)  NULL,
  `status`        ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  `salt`          VARCHAR(40)  NOT NULL,
  `password_hash` VARCHAR(64)  NOT NULL,
  `last_login`    DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `ix_users_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- D2 lecturers: profil dan maklumat perkhidmatan pensyarah
-- Medan perkhidmatan dibenarkan NULL supaya akaun boleh dicipta Admin
-- dahulu dan dilengkapkan oleh pensyarah kemudian (rujuk v_kelengkapan_pensyarah).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lecturers` (
  `id`               VARCHAR(40)  NOT NULL,
  `user_id`          VARCHAR(40)  NOT NULL,
  `staff_id`         VARCHAR(30)  NULL,
  `full_name`        VARCHAR(120) NOT NULL,
  `email`            VARCHAR(120) NOT NULL,
  `department`       VARCHAR(80)  NULL,
  `position`         VARCHAR(60)  NULL,
  `phone`            VARCHAR(40)  NULL,
  `location`         VARCHAR(120) NULL,
  `bio`              TEXT         NULL,
  `photo`            MEDIUMTEXT   NULL,
  `grade`            ENUM('DS11','DS13','DS14','VK7','VK6','VK5') NULL,
  `grade_since`      DATE         NULL,
  `appointed_on`     DATE         NULL,
  `confirmed_on`     DATE         NULL,
  `vk7_since`        DATE         NULL,
  `field`            ENUM('Sains & Teknologi','Sains Sosial','Klinikal') NULL,
  `has_phd`          ENUM('Ya','Tidak') NULL,
  `has_prof_qual`    ENUM('Ya','Tidak') NULL,
  `employment`       ENUM('Tetap','Kontrak','Pinjaman') NULL,
  `syarahan_perdana` ENUM('Ya','Tidak') NULL,
  `monograf`         ENUM('Ya','Tidak') NULL,
  `scopus_h_index`   SMALLINT UNSIGNED NULL,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lecturers_user` (`user_id`),
  UNIQUE KEY `uq_lecturers_staff` (`staff_id`),
  KEY `ix_lecturers_department` (`department`),
  KEY `ix_lecturers_grade` (`grade`),
  CONSTRAINT `fk_lecturers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- D8 documents: dokumen sokongan (PDF, JPG, PNG, DOC, DOCX; maksimum 5 MB)
-- Dibina sebelum jadual rekod kerana jadual rekod merujuk documents.id.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documents` (
  `id`          VARCHAR(40)  NOT NULL,
  `lecturer_id` VARCHAR(40)  NOT NULL,
  `doc_type`    VARCHAR(40)  NOT NULL,
  `title`       VARCHAR(200) NOT NULL,
  `file_name`   VARCHAR(200) NOT NULL,
  `mime`        VARCHAR(100) NOT NULL,
  `size`        INT UNSIGNED NOT NULL,
  `file_ref`    VARCHAR(255) NOT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_documents_lecturer` (`lecturer_id`),
  CONSTRAINT `fk_documents_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_documents_size` CHECK (`size` > 0 AND `size` <= 5242880)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- D3 activities: pengajaran, penyeliaan, pengiktirafan akademik,
-- kepimpinan dan khidmat (jenis dalam lajur kind)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activities` (
  `id`           VARCHAR(40)  NOT NULL,
  `lecturer_id`  VARCHAR(40)  NOT NULL,
  `kind`         VARCHAR(30)  NOT NULL,
  `title`        VARCHAR(255) NULL,
  `year`         SMALLINT     NULL,
  `level`        VARCHAR(40)  NULL,
  `role`         VARCHAR(30)  NULL,
  `student`      VARCHAR(120) NULL,
  `graduated`    ENUM('Ya','Tidak') NULL,
  `semester`     VARCHAR(30)  NULL,
  `workload_met` ENUM('Ya','Tidak') NULL,
  `blended`      ENUM('Ya','Tidak') NULL,
  `score`        DECIMAL(3,1) NULL,
  `terms`        TINYINT UNSIGNED NULL,
  `document_id`  VARCHAR(40)  NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_activities_lecturer_kind_year` (`lecturer_id`, `kind`, `year`),
  KEY `ix_activities_document` (`document_id`),
  CONSTRAINT `fk_activities_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activities_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_activities_year` CHECK (`year` IS NULL OR `year` BETWEEN 1950 AND 2100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- D4 research: projek penyelidikan
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `research` (
  `id`             VARCHAR(40)  NOT NULL,
  `lecturer_id`    VARCHAR(40)  NOT NULL,
  `title`          VARCHAR(255) NOT NULL,
  `area`           VARCHAR(120) NULL,
  `category`       VARCHAR(60)  NULL,
  `year`           SMALLINT     NULL,
  `status`         ENUM('Sedang Berjalan','Selesai','Dirancang') NOT NULL,
  `description`    TEXT         NULL,
  `document_id`    VARCHAR(40)  NULL,
  `role`           ENUM('Ketua Penyelidik','Ahli') NULL,
  `grant_source`   VARCHAR(60)  NULL,
  `amount`         DECIMAL(14,2) NULL,
  `registered_ppi` ENUM('Ya','Tidak') NULL,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_research_lecturer_year` (`lecturer_id`, `year`),
  KEY `ix_research_document` (`document_id`),
  CONSTRAINT `fk_research_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_research_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_research_year` CHECK (`year` IS NULL OR `year` BETWEEN 1950 AND 2100),
  CONSTRAINT `ck_research_amount` CHECK (`amount` IS NULL OR `amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- D5 publications: penerbitan
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `publications` (
  `id`          VARCHAR(40)  NOT NULL,
  `lecturer_id` VARCHAR(40)  NOT NULL,
  `title`       VARCHAR(255) NOT NULL,
  `type`        VARCHAR(40)  NOT NULL,
  `venue`       VARCHAR(200) NULL,
  `year`        SMALLINT     NULL,
  `status`      ENUM('Diterbitkan','Dalam Percetakan','Dalam Semakan','Draf') NOT NULL,
  `doi`         VARCHAR(255) NULL,
  `document_id` VARCHAR(40)  NULL,
  `indexing`    VARCHAR(30)  NULL,
  `author_role` VARCHAR(40)  NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_publications_lecturer_year` (`lecturer_id`, `year`),
  KEY `ix_publications_document` (`document_id`),
  CONSTRAINT `fk_publications_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_publications_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_publications_year` CHECK (`year` IS NULL OR `year` BETWEEN 1950 AND 2100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- D6 consultancy: perundingan
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `consultancy` (
  `id`             VARCHAR(40)  NOT NULL,
  `lecturer_id`    VARCHAR(40)  NOT NULL,
  `project`        VARCHAR(255) NOT NULL,
  `client`         VARCHAR(150) NULL,
  `role`           VARCHAR(60)  NULL,
  `year`           SMALLINT     NULL,
  `status`         ENUM('Sedang Berjalan','Selesai','Dirancang') NOT NULL,
  `description`    TEXT         NULL,
  `document_id`    VARCHAR(40)  NULL,
  `kind`           VARCHAR(80)  NULL,
  `amount`         DECIMAL(14,2) NULL,
  `registered_ppi` ENUM('Ya','Tidak') NULL,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_consultancy_lecturer_year` (`lecturer_id`, `year`),
  KEY `ix_consultancy_document` (`document_id`),
  CONSTRAINT `fk_consultancy_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_consultancy_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_consultancy_year` CHECK (`year` IS NULL OR `year` BETWEEN 1950 AND 2100),
  CONSTRAINT `ck_consultancy_amount` CHECK (`amount` IS NULL OR `amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- D7 achievements: pencapaian (anugerah dan pingat)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `achievements` (
  `id`          VARCHAR(40)  NOT NULL,
  `lecturer_id` VARCHAR(40)  NOT NULL,
  `name`        VARCHAR(200) NOT NULL,
  `category`    VARCHAR(40)  NULL,
  `year`        SMALLINT     NULL,
  `description` TEXT         NULL,
  `document_id` VARCHAR(40)  NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_achievements_lecturer_year` (`lecturer_id`, `year`),
  KEY `ix_achievements_document` (`document_id`),
  CONSTRAINT `fk_achievements_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_achievements_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_achievements_year` CHECK (`year` IS NULL OR `year` BETWEEN 1950 AND 2100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- D9 lppt_scores: markah LPPT setahun (satu markah bagi setiap tahun)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lppt_scores` (
  `id`          VARCHAR(40)  NOT NULL,
  `lecturer_id` VARCHAR(40)  NOT NULL,
  `year`        SMALLINT     NOT NULL,
  `score`       DECIMAL(5,2) NOT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lppt_lecturer_year` (`lecturer_id`, `year`),
  CONSTRAINT `fk_lppt_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_lppt_year` CHECK (`year` BETWEEN 1950 AND 2100),
  CONSTRAINT `ck_lppt_score` CHECK (`score` BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- D10 disciplinary: hukuman tatatertib (mempengaruhi tempoh tidak layak)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `disciplinary` (
  `id`          VARCHAR(40) NOT NULL,
  `lecturer_id` VARCHAR(40) NOT NULL,
  `case_no`     VARCHAR(40) NOT NULL,
  `penalty`     ENUM('Amaran','Denda','Lucut Hak Emolumen','Tangguh Pergerakan Gaji','Turun Gaji','Turun Pangkat') NOT NULL,
  `date`        DATE        NOT NULL,
  `note`        TEXT        NULL,
  `created_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_disciplinary_lecturer_date` (`lecturer_id`, `date`),
  CONSTRAINT `fk_disciplinary_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Paparan untuk Proses 2.0 (Semak Kelengkapan Rekod Pensyarah) bagi Admin.
-- ANDAIAN: "lengkap" = medan wajib profil dan maklumat perkhidmatan telah
-- diisi. Ia tidak bergantung pada bilangan rekod atau bar kemajuan.
-- Paparan ini tidak mendedahkan kandungan rekod kenaikan pangkat.
-- Ubah senarai medan di bawah jika takrifan "lengkap" berubah.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_kelengkapan_pensyarah` AS
SELECT
  l.`id`          AS lecturer_id,
  l.`full_name`   AS full_name,
  l.`department`  AS department,
  CASE
    WHEN l.`staff_id` IS NOT NULL AND l.`staff_id` <> ''
     AND l.`department` IS NOT NULL AND l.`department` <> ''
     AND l.`position` IS NOT NULL AND l.`position` <> ''
     AND l.`grade` IS NOT NULL
     AND l.`appointed_on` IS NOT NULL
     AND l.`confirmed_on` IS NOT NULL
     AND l.`field` IS NOT NULL
     AND l.`has_phd` IS NOT NULL
     AND l.`employment` IS NOT NULL
    THEN 'Lengkap' ELSE 'Tidak Lengkap'
  END AS status_rekod
FROM `lecturers` l
JOIN `users` u ON u.`id` = l.`user_id` AND u.`status` = 'Active';

-- ---------------------------------------------------------------------
-- SET SEMULA (MEMADAM SEMUA DATA TalentPro) - buang komen hanya jika pasti:
--   DROP DATABASE `talentpro`;
-- ---------------------------------------------------------------------

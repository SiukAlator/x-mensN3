CREATE TABLE historic
(
  id      INT AUTO_INCREMENT
    PRIMARY KEY,
  data_in VARCHAR(255) NULL,
  status  INT          NULL,
  date_in TIMESTAMP    NULL,
  CONSTRAINT historic_id_uindex
  UNIQUE (id),
  CONSTRAINT historic_data_in_uindex
  UNIQUE (data_in)
)
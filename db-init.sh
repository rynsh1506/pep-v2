#!/bin/bash
set -e

echo "=== Initializing databases ==="
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS \`cadeb_db\`; CREATE DATABASE IF NOT EXISTS \`db_dtot\`;"

echo "=== Importing cadeb_db ==="
mysql -u root -p"$MYSQL_ROOT_PASSWORD" cadeb_db < /tmp/cadeb_db.sql

echo "=== Importing db_dtot ==="
mysql -u root -p"$MYSQL_ROOT_PASSWORD" db_dtot < /tmp/db_dtot.sql

echo "=== Databases initialized successfully ==="

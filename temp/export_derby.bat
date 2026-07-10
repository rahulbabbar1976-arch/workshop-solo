@echo off
set JAVA="C:\Users\rahul\OneDrive\Desktop\JobCard-2-Windows (1)\JobCard-2-Windows\program\jre\win-64\bin\java.exe"
set CP="C:\Users\rahul\OneDrive\Desktop\JobCard-2-Windows (1)\JobCard-2-Windows\program\lib\derby.jar";"C:\Users\rahul\OneDrive\Desktop\JobCard-2-Windows (1)\JobCard-2-Windows\program\lib\derbytools.jar";"C:\Users\rahul\OneDrive\Desktop\JobCard-2-Windows (1)\JobCard-2-Windows\program\lib\derbyshared.jar"
set DB=C:\Users\rahul\OneDrive\Desktop\workshop\temp\wdg_inspect\database
set OUT=C:\Users\rahul\OneDrive\Desktop\workshop\temp\derby_export

if not exist %OUT% mkdir %OUT%

echo connect 'jdbc:derby:%DB%'; > %TEMP%\derby_export.sql

echo -- CUSTOMERS >> %TEMP%\derby_export.sql
echo CALL SYSCS_UTIL.SYSCS_EXPORT_TABLE(null,'CUSTOMER','%OUT%\customers.csv',',','"','UTF-8'); >> %TEMP%\derby_export.sql

echo -- INVOICES (WORKSHEETS / JOB CARDS) >> %TEMP%\derby_export.sql
echo CALL SYSCS_UTIL.SYSCS_EXPORT_TABLE(null,'WORKSHEET','%OUT%\worksheets.csv',',','"','UTF-8'); >> %TEMP%\derby_export.sql

echo -- INVOICE ITEMS >> %TEMP%\derby_export.sql
echo CALL SYSCS_UTIL.SYSCS_EXPORT_TABLE(null,'INVOICE_ITEM','%OUT%\invoice_items.csv',',','"','UTF-8'); >> %TEMP%\derby_export.sql

echo -- INVOICES >> %TEMP%\derby_export.sql
echo CALL SYSCS_UTIL.SYSCS_EXPORT_TABLE(null,'INVOICE','%OUT%\invoices.csv',',','"','UTF-8'); >> %TEMP%\derby_export.sql

echo -- ITEMS (PARTS) >> %TEMP%\derby_export.sql
echo CALL SYSCS_UTIL.SYSCS_EXPORT_TABLE(null,'ITEM','%OUT%\parts.csv',',','"','UTF-8'); >> %TEMP%\derby_export.sql

echo -- MASTER ITEMS >> %TEMP%\derby_export.sql
echo CALL SYSCS_UTIL.SYSCS_EXPORT_TABLE(null,'MASTER_ITEM','%OUT%\master_items.csv',',','"','UTF-8'); >> %TEMP%\derby_export.sql

echo -- THINGS (VEHICLES) >> %TEMP%\derby_export.sql
echo CALL SYSCS_UTIL.SYSCS_EXPORT_TABLE(null,'THING','%OUT%\vehicles.csv',',','"','UTF-8'); >> %TEMP%\derby_export.sql

echo -- PROBLEMS (COMPLAINTS) >> %TEMP%\derby_export.sql
echo CALL SYSCS_UTIL.SYSCS_EXPORT_TABLE(null,'PROBLEM','%OUT%\problems.csv',',','"','UTF-8'); >> %TEMP%\derby_export.sql

echo exit; >> %TEMP%\derby_export.sql

%JAVA% -cp %CP% org.apache.derby.tools.ij %TEMP%\derby_export.sql
echo Done. CSVs saved to %OUT%

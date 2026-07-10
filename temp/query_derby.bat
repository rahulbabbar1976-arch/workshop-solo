@echo off
set JAVA="C:\Users\rahul\OneDrive\Desktop\JobCard-2-Windows (1)\JobCard-2-Windows\program\jre\win-64\bin\java.exe"
set CP="C:\Users\rahul\OneDrive\Desktop\JobCard-2-Windows (1)\JobCard-2-Windows\program\lib\derby.jar";"C:\Users\rahul\OneDrive\Desktop\JobCard-2-Windows (1)\JobCard-2-Windows\program\lib\derbytools.jar";"C:\Users\rahul\OneDrive\Desktop\JobCard-2-Windows (1)\JobCard-2-Windows\program\lib\derbyshared.jar"
set DB=C:\Users\rahul\OneDrive\Desktop\workshop\temp\wdg_inspect\database

echo connect 'jdbc:derby:%DB%'; > %TEMP%\derby_cmds.sql
echo SELECT CAST(TABLENAME AS VARCHAR(128)) FROM SYS.SYSTABLES WHERE CAST(TABLETYPE AS VARCHAR(1))='T' ORDER BY TABLENAME; >> %TEMP%\derby_cmds.sql
echo exit; >> %TEMP%\derby_cmds.sql

%JAVA% -cp %CP% org.apache.derby.tools.ij %TEMP%\derby_cmds.sql

import java.sql.*;

public class ExtractSchema {
    public static void main(String[] args) {
        String dbUrl = "jdbc:derby:C:/Users/rahul/OneDrive/Desktop/JobCard-2-Windows (1)/JobCard-2-Windows/program/database/DB";
        
        try (Connection conn = DriverManager.getConnection(dbUrl)) {
            DatabaseMetaData meta = conn.getMetaData();
            
            String[] types = {"TABLE"};
            try (ResultSet rs = meta.getTables(null, null, "%", types)) {
                while (rs.next()) {
                    String tableName = rs.getString("TABLE_NAME");
                    System.out.println("TABLE: " + tableName);
                    
                    try (ResultSet cols = meta.getColumns(null, null, tableName, "%")) {
                        while (cols.next()) {
                            String colName = cols.getString("COLUMN_NAME");
                            String colType = cols.getString("TYPE_NAME");
                            System.out.println("  " + colName + " (" + colType + ")");
                        }
                    }
                    System.out.println();
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}

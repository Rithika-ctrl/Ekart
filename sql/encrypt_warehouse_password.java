import java.nio.charset.StandardCharsets;
import java.security.spec.KeySpec;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Standalone AES Encryption Utility for EKART
 * 
 * Use this to encrypt the warehouse password before inserting into the database.
 * 
 * Compile: javac encrypt-warehouse-password.java
 * Run: java encrypt_warehouse_password <password>
 * 
 * Example: java encrypt_warehouse_password "Test@123"
 */
public class encrypt_warehouse_password {
    
    // Must match application.properties values
    private static final String SECRET_KEY = "aB!Cd$Ef%Gh&Ij(Kl)Mn*Op+Qr=St@Uv";
    private static final String SALT_VALUE = "AbCdEfGhIjKlMnOpQrStUvWxYz";
    
    public static String encrypt(String strToEncrypt) {
        try {
            byte[] iv = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 };
            IvParameterSpec ivspec = new IvParameterSpec(iv);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            KeySpec spec = new PBEKeySpec(SECRET_KEY.toCharArray(), SALT_VALUE.getBytes(), 65536, 256);
            SecretKey tmp = factory.generateSecret(spec);
            SecretKeySpec secretKey = new SecretKeySpec(tmp.getEncoded(), "AES");
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivspec);
            return Base64.getEncoder().encodeToString(cipher.doFinal(strToEncrypt.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            System.out.println("Error occurred during encryption: " + e.toString());
            e.printStackTrace();
        }
        return null;
    }
    
    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Usage: java encrypt_warehouse_password <password>");
            System.out.println("Example: java encrypt_warehouse_password \"Test@123\"");
            System.exit(1);
        }
        
        String password = args[0];
        String encrypted = encrypt(password);
        
        if (encrypted != null) {
            System.out.println("Plain password: " + password);
            System.out.println("Encrypted password: " + encrypted);
            System.out.println("\nUse the encrypted password in your SQL INSERT statement.");
        } else {
            System.out.println("Encryption failed!");
            System.exit(1);
        }
    }
}

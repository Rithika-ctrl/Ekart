package com.example.ekart.helper;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;

@Component
public class CloudinaryHelper {
	@Value("${cloudinary.cloud}")
	private String cloudname;
	@Value("${cloudinary.key}")
	private String key;
	@Value("${cloudinary.secret}")
	private String secret;

	// 🔥 Add this annotation to hide the warning from the library's raw Map
@SuppressWarnings("rawtypes")
public String saveToCloudinary(MultipartFile file) throws IOException {
    Cloudinary cloudinary = new Cloudinary("cloudinary://" + key + ":" + secret + "@" + cloudname + "");
    Map<String, Object> uploadOptions = new HashMap<>();
    uploadOptions.put("folder", "Products");

    Map map = cloudinary.uploader().upload(file.getBytes(), uploadOptions);
    return (String) map.get("url");
}

// 🔥 Upload video to Cloudinary
@SuppressWarnings("rawtypes")
public String saveVideoToCloudinary(MultipartFile file) throws IOException {
    Cloudinary cloudinary = new Cloudinary("cloudinary://" + key + ":" + secret + "@" + cloudname + "");
    Map<String, Object> uploadOptions = new HashMap<>();
    uploadOptions.put("folder", "Products/Videos");
    uploadOptions.put("resource_type", "video");

    Map map = cloudinary.uploader().upload(file.getBytes(), uploadOptions);
    return (String) map.get("url");
}
<<<<<<< HEAD
	// 🔥 Upload customer profile image to Cloudinary
	@SuppressWarnings("rawtypes")
	public String saveProfileImageToCloudinary(MultipartFile file) throws IOException {
	    Cloudinary cloudinary = new Cloudinary("cloudinary://" + key + ":" + secret + "@" + cloudname + "");
	    Map<String, Object> uploadOptions = new HashMap<>();
	    uploadOptions.put("folder", "Profiles");
	    uploadOptions.put("transformation", "c_fill,w_300,h_300,g_face");
	    Map map = cloudinary.uploader().upload(file.getBytes(), uploadOptions);
	    return (String) map.get("url");
	}
=======
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57

}
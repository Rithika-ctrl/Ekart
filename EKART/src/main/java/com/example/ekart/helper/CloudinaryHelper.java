package com.example.ekart.helper;
import org.springframework.beans.factory.annotation.Value;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

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

// 🔥 Upload banner image to Cloudinary
@SuppressWarnings("rawtypes")
public String saveBannerToCloudinary(MultipartFile file) throws IOException {
    Cloudinary cloudinary = new Cloudinary("cloudinary://" + key + ":" + secret + "@" + cloudname);
    Map<String, Object> uploadOptions = new HashMap<>();
    uploadOptions.put("folder", "Banners");
    uploadOptions.put("transformation", "w_1200,h_375,c_fill,q_auto,f_auto");
    Map map = cloudinary.uploader().upload(file.getBytes(), uploadOptions);
    return (String) map.get("secure_url");
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

}

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

    // The library returns a raw Map, so we use it here
    Map map = cloudinary.uploader().upload(file.getBytes(), uploadOptions);

    // Get the URL and return it
    return (String) map.get("url");

}

}

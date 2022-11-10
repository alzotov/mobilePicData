import { Injectable } from '@angular/core';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';

import { PimeyesService} from './pimeyes.service';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  private photoStorage = 'photos';
  private platform: Platform;

  constructor(platform: Platform, public api: PimeyesService) {
    this.platform = platform;
  }

  public async addNewToGallery() {
    // Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    const base64Data = await this.readAsBase64(capturedPhoto);
    console.log(base64Data);
    let rz,facesNo=0;
    try{
      rz = await this.api.getFacesNumber(base64Data).toPromise();
      console.log('image recognition result',rz);
      facesNo = rz.body.faces.length;
      console.log('no. faces recognized',facesNo);
    }
    catch(e){
      console.log("pimeyes call failed");
    }

    const savedImageFile = await this.savePicture(capturedPhoto,facesNo);
    this.photos.unshift(savedImageFile);

    Preferences.set({
      key: this.photoStorage,
      value: JSON.stringify(this.photos),
    });

    return rz;
  }

  public async loadSaved() {
    // Retrieve cached photo array data
    const photoList = await Preferences.get({ key: this.photoStorage });
    this.photos = JSON.parse(photoList.value) || [];

    // Display the photo by reading into base64 format
    for (const photo of this.photos) {
      // Read each saved photo's data from the Filesystem
      const readFile = await Filesystem.readFile({
        path: photo.filepath,
        directory: Directory.Data,
      });

      // Web platform only: Load the photo as base64 data
      photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      photo.facesNo = photo.facesNo||0;
    }
  }

  // Save picture to file on device
  private async savePicture(photo: Photo, facesNo: number) {
    // Convert photo to base64 format, required by Filesystem API to save
    const base64Data = await this.readAsBase64(photo);

    // Write the file to the data directory
    const fileName = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    if (this.platform.is('hybrid')) {
      // Display the new image by rewriting the 'file://' path to HTTP
      // Details: https://ionicframework.com/docs/building/webview#file-protocol
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
        facesNo
      };
    }
    else {
      // Use webPath to display the new image instead of base64 since it's
      // already loaded into memory
      return {
        filepath: fileName,
        webviewPath: photo.webPath,
        facesNo
      };
    }
  }

  private async readAsBase64(photo: Photo) {
    // "hybrid" will detect Cordova or Capacitor
    if (this.platform.is('hybrid')) {
      // Read the file into base64 format
      const file = await Filesystem.readFile({
        path: photo.path
      });

      return file.data;
    }
    else {
      // Fetch the photo, read as a blob, then convert to base64 format
      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      return await this.convertBlobToBase64(blob) as string;
    }
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

export interface UserPhoto {
  filepath: string;
  webviewPath: string;
  facesNo: number;
}

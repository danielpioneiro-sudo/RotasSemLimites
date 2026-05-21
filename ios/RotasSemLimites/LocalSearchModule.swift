import Foundation
import MapKit

@objc(LocalSearchModule)
class LocalSearchModule: NSObject {

  @objc(search:resolver:rejecter:)
  func search(
    query: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = query

      let center = CLLocationCoordinate2D(latitude: -14.235, longitude: -51.925)
      let span = MKCoordinateSpan(latitudeDelta: 40, longitudeDelta: 40)
      request.region = MKCoordinateRegion(center: center, span: span)

      let search = MKLocalSearch(request: request)
      search.start { response, error in
        if let error = error {
          reject("SEARCH_ERROR", error.localizedDescription, error)
          return
        }

        let results: [[String: Any]] = (response?.mapItems ?? []).map { item in
          let pm = item.placemark
          var parts: [String] = []

          if let sub = pm.subThoroughfare { parts.append(sub) }
          if let th = pm.thoroughfare { parts.append(th) }
          if let loc = pm.locality { parts.append(loc) }
          if let state = pm.administrativeArea { parts.append(state) }
          if let country = pm.country { parts.append(country) }

          return [
            "name": item.name ?? "",
            "address": parts.joined(separator: ", "),
            "latitude": pm.coordinate.latitude,
            "longitude": pm.coordinate.longitude,
          ]
        }

        resolve(results)
      }
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}

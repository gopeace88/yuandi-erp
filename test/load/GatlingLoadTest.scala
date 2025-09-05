package yuandi.erp.loadtest

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.jdbc.Predef._
import scala.concurrent.duration._
import scala.util.Random

class YuandiERPLoadTest extends Simulation {

  // HTTP 설정
  val httpProtocol = http
    .baseUrl(System.getProperty("baseUrl", "http://localhost:3000"))
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .acceptEncodingHeader("gzip, deflate")
    .userAgentHeader("YUANDI ERP Load Test / Gatling")
    .shareConnections

  // 테스트 데이터 피더
  val customerFeeder = Iterator.continually(Map(
    "customerName" -> s"고객_${Random.alphanumeric.take(10).mkString}",
    "customerPhone" -> s"010${Random.nextInt(90000000) + 10000000}",
    "customerEmail" -> s"customer_${Random.alphanumeric.take(10).mkString}@test.com",
    "pccc" -> s"P${Random.nextInt(900000000) + 100000000}000",
    "address" -> "서울특별시 강남구 테헤란로 123",
    "addressDetail" -> s"${Random.nextInt(20) + 1}층 ${Random.nextInt(100) + 1}호",
    "zipCode" -> "06234"
  ))

  val productFeeder = csv("products.csv").random
  val quantityFeeder = Iterator.continually(Map("quantity" -> (Random.nextInt(3) + 1)))

  // 인증 시나리오
  val authenticate = exec(
    http("Login")
      .post("/api/auth/login")
      .body(StringBody("""{"email":"admin@yuandi.com","password":"admin123"}"""))
      .check(
        status.is(200),
        jsonPath("$.token").saveAs("authToken")
      )
  )

  // 대시보드 시나리오
  val viewDashboard = exec(
    http("Dashboard Summary")
      .get("/api/dashboard/summary")
      .header("Authorization", "Bearer ${authToken}")
      .check(
        status.is(200),
        responseTimeInMillis.lessThan(3000)
      )
  ).pause(1, 3)
  .exec(
    http("Sales Trend")
      .get("/api/dashboard/sales-trend")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(200))
  ).pause(1, 2)
  .exec(
    http("Order Status Distribution")
      .get("/api/dashboard/order-status")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(200))
  )

  // 상품 관리 시나리오
  val manageProducts = exec(
    http("Get Products")
      .get("/api/products?page=1&limit=20")
      .header("Authorization", "Bearer ${authToken}")
      .check(
        status.is(200),
        jsonPath("$.data[*].id").findAll.saveAs("productIds")
      )
  ).pause(2, 5)
  .doIf(session => session("productIds").asOption[List[String]].isDefined) {
    exec(
      http("Get Product Detail")
        .get("/api/products/${productIds.random()}")
        .header("Authorization", "Bearer ${authToken}")
        .check(status.is(200))
    )
  }

  // 주문 생성 시나리오
  val createOrder = feed(customerFeeder)
    .feed(productFeeder)
    .feed(quantityFeeder)
    .exec(
      http("Create Order")
        .post("/api/orders")
        .header("Authorization", "Bearer ${authToken}")
        .body(ElFileBody("order-payload.json"))
        .check(
          status.is(201),
          jsonPath("$.data.orderNumber").saveAs("orderNumber"),
          jsonPath("$.data.id").saveAs("orderId"),
          responseTimeInMillis.lessThan(2000)
        )
    )
    .pause(1, 3)
    .doIf("${orderId.exists()}") {
      exec(
        http("Get Order Detail")
          .get("/api/orders/${orderId}")
          .header("Authorization", "Bearer ${authToken}")
          .check(status.is(200))
      )
    }

  // 배송 처리 시나리오
  val processShipment = exec(
    http("Get Pending Shipments")
      .get("/api/orders?status=PAID&limit=10")
      .header("Authorization", "Bearer ${authToken}")
      .check(
        status.is(200),
        jsonPath("$.data[*].id").findAll.saveAs("shippableOrderIds")
      )
  )
  .doIf(session => session("shippableOrderIds").asOption[List[String]].filter(_.nonEmpty).isDefined) {
    exec(session => {
      val orderIds = session("shippableOrderIds").as[List[String]]
      session.set("randomOrderId", orderIds(Random.nextInt(orderIds.length)))
    })
    .exec(
      http("Register Tracking")
        .patch("/api/orders/${randomOrderId}/ship")
        .header("Authorization", "Bearer ${authToken}")
        .body(StringBody("""{
          "courier": "CJ대한통운",
          "trackingNumber": "${trackingNumber}",
          "shippingFee": 3000
        }"""))
        .check(status.in(200, 201))
    )
  }

  // 재고 관리 시나리오
  val manageInventory = exec(
    http("Get Low Stock Items")
      .get("/api/products?lowStock=true")
      .header("Authorization", "Bearer ${authToken}")
      .check(
        status.is(200),
        jsonPath("$.data[*].id").findAll.saveAs("lowStockIds")
      )
  )
  .doIf(session => session("lowStockIds").asOption[List[String]].filter(_.nonEmpty).isDefined) {
    exec(session => {
      val productIds = session("lowStockIds").as[List[String]]
      session.set("restockProductId", productIds(Random.nextInt(productIds.length)))
    })
    .exec(
      http("Restock Product")
        .patch("/api/inventory/${restockProductId}/adjust")
        .header("Authorization", "Bearer ${authToken}")
        .body(StringBody("""{
          "quantity": ${Random.nextInt(50) + 10},
          "type": "inbound",
          "reason": "정기 입고"
        }"""))
        .check(status.is(200))
    )
  }

  // 고객 포털 시나리오
  val customerPortal = feed(customerFeeder)
    .exec(
      http("Track Orders")
        .get("/api/track")
        .queryParam("name", "${customerName}")
        .queryParam("phone", "${customerPhone}")
        .check(
          status.in(200, 404),
          responseTimeInMillis.lessThan(1000)
        )
    )

  // 복합 비즈니스 플로우
  val businessFlow = exec(authenticate)
    .exec(viewDashboard)
    .pause(2, 5)
    .randomSwitch(
      30d -> exec(createOrder),
      25d -> exec(manageProducts),
      20d -> exec(processShipment),
      15d -> exec(manageInventory),
      10d -> exec(customerPortal)
    )

  // 시나리오 정의
  val adminUsers = scenario("Admin Users")
    .exec(authenticate)
    .during(10.minutes) {
      exec(viewDashboard)
        .pause(5, 10)
        .exec(manageProducts)
        .pause(5, 10)
        .exec(createOrder)
        .pause(3, 7)
    }

  val orderManagers = scenario("Order Managers")
    .exec(authenticate)
    .during(10.minutes) {
      exec(createOrder)
        .pause(3, 6)
        .exec(manageInventory)
        .pause(2, 5)
    }

  val shipManagers = scenario("Ship Managers")
    .exec(authenticate)
    .during(10.minutes) {
      exec(processShipment)
        .pause(5, 10)
    }

  val customers = scenario("Customers")
    .during(10.minutes) {
      exec(customerPortal)
        .pause(10, 30)
    }

  val mixedLoad = scenario("Mixed Load")
    .exec(businessFlow)

  // 로드 시뮬레이션 설정
  setUp(
    // 점진적 증가 시나리오
    adminUsers.inject(
      rampUsers(5) during (1.minute),
      constantUsersPerSec(2) during (5.minutes),
      rampUsersPerSec(2) to 5 during (2.minutes),
      constantUsersPerSec(5) during (3.minutes),
      rampUsersPerSec(5) to 0 during (1.minute)
    ),
    
    orderManagers.inject(
      rampUsers(10) during (1.minute),
      constantUsersPerSec(5) during (5.minutes),
      rampUsersPerSec(5) to 10 during (2.minutes),
      constantUsersPerSec(10) during (3.minutes),
      rampUsersPerSec(10) to 0 during (1.minute)
    ),
    
    shipManagers.inject(
      rampUsers(5) during (1.minute),
      constantUsersPerSec(3) during (10.minutes),
      rampUsersPerSec(3) to 0 during (1.minute)
    ),
    
    customers.inject(
      rampUsers(20) during (2.minutes),
      constantUsersPerSec(10) during (8.minutes),
      rampUsersPerSec(10) to 0 during (2.minutes)
    ),
    
    // 스파이크 테스트
    mixedLoad.inject(
      nothingFor(15.minutes),
      atOnceUsers(50),
      nothingFor(30.seconds),
      rampUsers(100) during (30.seconds),
      constantUsersPerSec(50) during (2.minutes),
      rampUsersPerSec(50) to 0 during (30.seconds)
    )
  ).protocols(httpProtocol)
  .assertions(
    // 전역 임계값
    global.responseTime.max.lt(10000),
    global.responseTime.mean.lt(3000),
    global.responseTime.percentile(95).lt(5000),
    global.responseTime.percentile(99).lt(8000),
    global.successfulRequests.percent.gt(95),
    
    // 상세 임계값
    details("Dashboard Summary").responseTime.mean.lt(1500),
    details("Create Order").responseTime.percentile(95).lt(2000),
    details("Track Orders").responseTime.mean.lt(1000),
    details("Get Products").responseTime.mean.lt(1500),
    
    // 처리량 임계값
    global.requestsPerSec.gt(50)
  )
}

// 고급 스트레스 테스트
class YuandiERPStressTest extends Simulation {
  
  val httpProtocol = http
    .baseUrl(System.getProperty("baseUrl", "http://localhost:3000"))
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  val stressScenario = scenario("Stress Test")
    .exec(YuandiERPLoadTest.businessFlow)

  setUp(
    stressScenario.inject(
      // 단계별 스트레스 증가
      rampUsers(50) during (2.minutes),     // 워밍업
      constantUsersPerSec(25) during (3.minutes),
      rampUsersPerSec(25) to 50 during (2.minutes),
      constantUsersPerSec(50) during (3.minutes),
      rampUsersPerSec(50) to 100 during (2.minutes),
      constantUsersPerSec(100) during (3.minutes),
      rampUsersPerSec(100) to 200 during (2.minutes),
      constantUsersPerSec(200) during (3.minutes),  // 최대 부하
      rampUsersPerSec(200) to 0 during (2.minutes)  // 쿨다운
    )
  ).protocols(httpProtocol)
  .assertions(
    global.responseTime.percentile(95).lt(10000),
    global.successfulRequests.percent.gt(90)
  )
}

// 내구성 테스트
class YuandiERPEnduranceTest extends Simulation {
  
  val httpProtocol = http
    .baseUrl(System.getProperty("baseUrl", "http://localhost:3000"))
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  val enduranceScenario = scenario("Endurance Test")
    .exec(YuandiERPLoadTest.businessFlow)

  setUp(
    enduranceScenario.inject(
      rampUsers(100) during (5.minutes),
      constantUsersPerSec(50) during (4.hours),  // 4시간 지속
      rampUsersPerSec(50) to 0 during (5.minutes)
    )
  ).protocols(httpProtocol)
  .assertions(
    global.responseTime.mean.lt(3000),
    global.successfulRequests.percent.gt(99),
    global.responseTime.stdDev.lt(1000)  // 응답시간 일관성 확인
  )
}
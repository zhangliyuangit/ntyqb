package com.ntyqb.backend.repository;

import com.ntyqb.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByMockKey(String mockKey);

    Optional<User> findByOpenId(String openId);

    @Query("""
            select u from User u
            where lower(u.nickname) like lower(concat('%', :keyword, '%'))
            order by u.nickname asc
            """)
    List<User> searchByKeyword(String keyword);
}

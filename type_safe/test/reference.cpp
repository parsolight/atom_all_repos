// Copyright (C) 2017 Jonathan Müller <jonathanmueller.dev@gmail.com>
// This file is subject to the license terms in the LICENSE file
// found in the top-level directory of this distribution.

#include <type_safe/reference.hpp>

#include <catch.hpp>
#include <functional>

#include "debugger_type.hpp"

using namespace type_safe;

template <typename T>
void check_object_ref(const object_ref<T>& ref, const debugger_type& value)
{
    REQUIRE(value.ctor());
    REQUIRE(&ref.get() == &value);
    REQUIRE(&*ref == &value);
    REQUIRE(ref->id == value.id);
    REQUIRE(ref == value);
    REQUIRE(value == ref);
}

void check_object_ref(const xvalue_ref<debugger_type> ref, const debugger_type& value)
{
    REQUIRE(value.ctor());
    REQUIRE(ref->id == value.id);
    REQUIRE(ref == value);
    REQUIRE(value == ref);
}

TEST_CASE("object_ref")
{
    debugger_type       value(42);
    const debugger_type cvalue(128);

    // value ctor
    object_ref<debugger_type> a(value);
    check_object_ref(a, value);

    object_ref<const debugger_type> b(cvalue);
    check_object_ref(b, cvalue);

    object_ref<const debugger_type> c(value);
    check_object_ref(c, value);

    // ref ctor
    object_ref<debugger_type> d(a);
    check_object_ref(d, value);

    object_ref<const debugger_type> e(b);
    check_object_ref(e, cvalue);

    object_ref<const debugger_type> f(a);
    check_object_ref(f, value);

    // comparison
    REQUIRE(a == d);
    REQUIRE(b == e);
    REQUIRE(c == f);
    REQUIRE(a == c);
    REQUIRE(a != b);
    REQUIRE(a != e);

    REQUIRE(a != cvalue);
    REQUIRE(cvalue != a);
    REQUIRE(e != value);
    REQUIRE(value != e);

    // with
    with(a,
         [&](debugger_type& a, int i) {
             REQUIRE(i == 42);
             REQUIRE(a.id == value.id);
         },
         42);

    // ref/cref
    auto g = ref(value);
    static_assert(std::is_same<decltype(g), object_ref<debugger_type>>::value, "");
    check_object_ref(g, value);

    auto h = ref(cvalue);
    static_assert(std::is_same<decltype(h), object_ref<const debugger_type>>::value, "");
    check_object_ref(h, cvalue);

    auto i = cref(value);
    static_assert(std::is_same<decltype(i), object_ref<const debugger_type>>::value, "");
    check_object_ref(i, value);

    // copy/move
    auto value2 = copy(a);
    REQUIRE(value2.id == value.id);
    REQUIRE(value2.copy_ctor());

    xvalue_ref<debugger_type> j(value);
    check_object_ref(j, value);

    auto value3 = move(j);
    REQUIRE(value3.id == value.id);
    REQUIRE(value3.move_ctor());
}

TEST_CASE("array_ref")
{
    int array[3]  = {1, 2, 3};
    int array2[1] = {1};

    array_ref<int> ref(array);
    REQUIRE(ref.data() == array);
    REQUIRE((ref.size() == 3u));

    REQUIRE(ref[0u] == 1);
    REQUIRE(ref[1u] == 2);
    REQUIRE(ref[2u] == 3);

    ref[0u] = 100;
    REQUIRE(array[0] == 100);

    SECTION("ctor")
    {
        array_ref<int> a(array, array + 3);
        REQUIRE(a.data() == array);
        REQUIRE((a.size() == 3u));

        array_ref<int> b(array, 3u);
        REQUIRE(b.data() == array);
        REQUIRE((b.size() == 3u));

        array_ref<int> c(array);
        REQUIRE(c.data() == array);
        REQUIRE((c.size() == 3u));
    }
    SECTION("operator=")
    {
        ref = array2;
        REQUIRE(ref.data() == array2);
        REQUIRE((ref.size() == 1u));
    }
    SECTION("assign range")
    {
        ref.assign(array2, array2 + 1);
        REQUIRE(ref.data() == array2);
        REQUIRE((ref.size() == 1u));
    }
    SECTION("assign size")
    {
        ref.assign(array2, 1u);
        REQUIRE(ref.data() == array2);
        REQUIRE((ref.size() == 1u));
    }
    SECTION("assign array")
    {
        ref.assign(array2);
        REQUIRE(ref.data() == array2);
        REQUIRE((ref.size() == 1u));
    }
    SECTION("begin()/end()")
    {
        REQUIRE(ref.begin() == array);
        REQUIRE(ref.end() == array + 3);
    }
}

// fake polymorphic lambda, due to C++11 requirement
struct lambda
{
    template <typename T>
    void operator()(T obj) const
    {
        REQUIRE(obj == 0);
    }

    template <typename T>
    using ptr_type = void (*)(T);

    template <typename T>
    operator ptr_type<T>() const
    {
        return [](T obj) { REQUIRE(obj == 0); };
    }
};

TEST_CASE("function_ref")
{
    SECTION("functor")
    {
        struct functor
        {
            int operator()(int a, int b)
            {
                return a + b;
            }

            void operator()(int& i)
            {
                REQUIRE(i == 0);
                i = 1;
            }
        } f;

        function_ref<int(int, int)> a(f);
        REQUIRE(a(1, 3) == 4);

        function_ref<int(int, short)> b(f);
        REQUIRE(b(1, 3) == 4);

        auto var = 0;
        function_ref<void(int, int&)> c(f);
        c(1, var);

        function_ref<void(int&)> d(f);
        d(var);
        REQUIRE(var == 1);
    }
    SECTION("function pointer")
    {
        auto f = static_cast<int (*)(int, int)>([](int a, int b) { return a + b; });

        function_ref<int(int, int)> a(f);
        REQUIRE(a(1, 3) == 4);

        function_ref<int(int, short)> b(f);
        REQUIRE(a(1, 3) == 4);

        function_ref<void(int, int)> c(f);
        c(1, 3);
    }
    SECTION("lambda")
    {
        auto f = [](int a, int b) { return a + b; };

        function_ref<int(int, int)> a(f);
        REQUIRE(a(1, 3) == 4);

        function_ref<int(int, short)> b(f);
        REQUIRE(a(1, 3) == 4);

        function_ref<void(int, int)> c(f);
        c(1, 3);
    }
    SECTION("polymorphic lambda")
    {
        function_ref<void(int)> a(lambda{});
        a(0);

        function_ref<void(short)> b(lambda{});
        b(0);
    }
    SECTION("member function")
    {
        struct foo
        {
            void func(int i)
            {
                REQUIRE(i == 0);
            }
        };

        function_ref<void(foo, int)> a([](foo f, int i) { f.func(i); });
        a(foo{}, 0);

        auto fnc = std::mem_fn(&foo::func);
        function_ref<void(foo, int)> b(fnc);
        b(foo{}, 0);
    }
    SECTION("ref conversion")
    {
        function_ref<int(int, int)> a([](int a, int b) { return a + b; });
        REQUIRE(a(1, 3) == 4);

        function_ref<int(int, short)> b(a);
        REQUIRE(b(1, 3) == 4);

        function_ref<void(int, int)> c(a);
        c(1, 3);
    }
    SECTION("assignment")
    {
        auto f = [] { return 0; };
        auto g = [] { return 1; };

        function_ref<int()> a(f);
        REQUIRE(a() == 0);

        function_ref<int()> b(g);
        REQUIRE(g() == 1);

        b = a;
        REQUIRE(b() == 0);

        a = g;
        REQUIRE(a() == 1);
    }
}
